# Polls Cursor A + B2 control files every 5 minutes (file read only).
# Invokes @cursor/sdk Agent only when Inbox is PREPARED and pickup conditions match.
param(
  [int]$PollSeconds = 300,
  [string]$Lanes = "A,B2",
  [int]$CooldownMinutes = 30,
  [int]$InvokeTimeoutMinutes = 45
)

$ErrorActionPreference = "Continue"
$auditDir = $PSScriptRoot
$executorDir = Join-Path $auditDir "cursor-inbox-executor"
$scriptPath = Join-Path $executorDir "cursor-inbox-executor.mjs"
$hbDaemon = Join-Path $auditDir "CURSOR_EXECUTOR_DAEMON_HEARTBEAT.md"

$handoffRoot = Split-Path -Parent $auditDir
$projectRoot = Split-Path -Parent $handoffRoot

function Get-ControlField([string]$text, [string]$name) {
  # PowerShell double-quoted strings do NOT treat \ as an escape (only `).
  # ":\\s*" therefore matches a literal backslash-s, not whitespace — use single quotes.
  $m = [regex]::Match($text, '(?m)^' + [regex]::Escape($name) + ':\s*(.*)$')
  if ($m.Success) { return $m.Groups[1].Value.Trim() }
  return ""
}

function Set-ControlField([string]$text, [string]$name, [string]$value) {
  $pattern = "(?m)^" + [regex]::Escape($name) + ":.*$"
  $line = "$name`: $value"
  if ([regex]::IsMatch($text, $pattern)) {
    return [regex]::Replace($text, $pattern, $line, 1)
  }
  return $text.TrimEnd() + "`r`n" + $line + "`r`n"
}

function Get-LaneInboxPath([string]$lane) {
  $controlDir = Join-Path $handoffRoot "control"
  if ($lane -eq "B2") {
    $canonical = Join-Path $controlDir "CURSOR_B2_INBOX.md"
    $mirror = Join-Path $auditDir "CURSOR_B2_INBOX.md"
  } else {
    $canonical = Join-Path $controlDir "CURSOR_A_INBOX.md"
    $mirror = Join-Path $auditDir "CURSOR_INBOX.md"
  }
  if (Test-Path -LiteralPath $canonical) {
    try {
      $text = Get-Content -LiteralPath $canonical -Raw -Encoding utf8
      $state = Get-ControlField $text "state"
      $authority = Get-ControlField $text "control-authority"
      if ($state -eq "PREPARED" -or $authority -eq "GitHub") { return $canonical }
    } catch {}
  }
  return $mirror
}

function Reconcile-StaleLocalMirror([string]$lane) {
  $inbox = Get-LaneInboxPath $lane
  if (!(Test-Path -LiteralPath $inbox)) { return }

  try {
    $text = Get-Content -LiteralPath $inbox -Raw -Encoding utf8
    $state = Get-ControlField $text "state"
    if ($state -ne "LOCAL_MIRROR_PENDING" -and $state -ne "LOCAL_MIRROR_RECOVERY_FAILED" -and $state -ne "PREPARED") { return }

    $taskKey = Get-ControlField $text "task-key"
    if (!$taskKey) { return }

    $instructionRel = Get-ControlField $text "instruction-path"
    $instructionPath = $null
    if ($instructionRel) {
      $normalizedRel = $instructionRel -replace '/', '\'
      $instructionPath = if ($normalizedRel.StartsWith('_handoff-artifacts\')) {
        Join-Path $projectRoot $normalizedRel
      } else {
        Join-Path $handoffRoot $normalizedRel
      }
    } else {
      $instructionPath = Join-Path $auditDir ("current\" + $taskKey + "\gpt-to-cursor-instruction.txt")
    }

    $recoveryScript = Join-Path $auditDir "cursor-publication\lib\local-mirror-recovery.mjs"
    if (Test-Path -LiteralPath $recoveryScript) {
      $recoveryJson = & node --input-type=module -e @"
import { attemptLocalMirrorRecovery, reconcileInboxAfterRecovery, createLocalSyncFetch } from './cursor-publication/lib/local-mirror-recovery.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const auditDir = process.argv[1];
const lane = process.argv[2];
const inboxPath = process.argv[3];
const inboxText = await readFile(inboxPath, 'utf8');
const recovery = await attemptLocalMirrorRecovery({ lane, auditDir, fetchDriveInstruction: createLocalSyncFetch(auditDir) });
const reconciled = await reconcileInboxAfterRecovery(inboxText, auditDir, lane);
if (reconciled.changed) {
  const tmp = inboxPath + '.tmp.' + process.pid;
  await writeFile(tmp, reconciled.inboxText, 'utf8');
  const { rename } = await import('node:fs/promises');
  await rename(tmp, inboxPath);
}
console.log(JSON.stringify({ recovery, reconciled: { changed: reconciled.changed, reason: reconciled.reason } }));
"@ $auditDir $lane $inbox 2>$null
      if ($LASTEXITCODE -eq 0 -and $recoveryJson) {
        Write-Output "LOCAL_MIRROR_RECOVERY lane=$lane payload=$recoveryJson"
        return
      }
    }

    if (!(Test-Path -LiteralPath $instructionPath -PathType Leaf)) {
      $now = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
      $text = Set-ControlField $text "local-recovery-result" "LOCAL_MIRROR_RECOVERY_FAILED:INSTRUCTION_MISSING"
      $text = Set-ControlField $text "updatedAt" $now
      $tmp = "$inbox.tmp.$PID"
      [System.IO.File]::WriteAllText($tmp, $text, (New-Object System.Text.UTF8Encoding($false)))
      Move-Item -LiteralPath $tmp -Destination $inbox -Force
      Write-Output "LOCAL_MIRROR_RECOVERY_ATTEMPTED lane=$lane task=$taskKey result=INSTRUCTION_MISSING"
      return
    }
    $item = Get-Item -LiteralPath $instructionPath -ErrorAction Stop
    if ($item.Length -le 0) {
      Write-Output "LOCAL_MIRROR_RECOVERY_ATTEMPTED lane=$lane task=$taskKey result=LOCAL_MIRROR_EMPTY"
      return
    }

    if ($state -eq "PREPARED") { return }

    $now = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
    $text = Set-ControlField $text "state" "PREPARED"
    $text = Set-ControlField $text "runtime-status" "local mirror revalidated by SDK executor preflight; normal pickup may proceed"
    $text = Set-ControlField $text "updatedAt" $now
    $text = Set-ControlField $text "publication-integrity" "DRIVE_VERIFIED_LOCAL_PRESENT_NONEMPTY"
    $text = Set-ControlField $text "local-mirror-status" "VERIFIED_LOCAL_PRESENT_NONEMPTY"
    $text = Set-ControlField $text "local-mirror-error" ""
    $text = Set-ControlField $text "local-recovery-result" "RECONCILED_BY_EXECUTOR_PREFLIGHT"

    $tmp = "$inbox.tmp.$PID"
    [System.IO.File]::WriteAllText($tmp, $text, (New-Object System.Text.UTF8Encoding($false)))
    Move-Item -LiteralPath $tmp -Destination $inbox -Force
    Write-Output "LOCAL_MIRROR_RECONCILED lane=$lane task=$taskKey path=$instructionPath"
  } catch {
    Write-Output "LOCAL_MIRROR_RECONCILE_ERROR lane=$lane error=$($_.Exception.Message)"
  }
}

function Write-DaemonHeartbeat([string]$status, [string]$note) {
  $now = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
  $lines = @(
    "# Cursor SDK executor daemon",
    "executor: cursor-sdk-local-daemon",
    "status: $status",
    "pollInterval: ${PollSeconds}s",
    "invokeTimeoutMinutes: $InvokeTimeoutMinutes",
    "lastDaemonAliveAt: $now",
    "lanes: $Lanes",
    "pid: $PID",
    "note: $note"
  )
  $tmp = "$hbDaemon.tmp.$PID"
  for ($i = 0; $i -lt 5; $i++) {
    try {
      $lines | Set-Content -Encoding utf8 -Path $tmp -ErrorAction Stop
      Move-Item -LiteralPath $tmp -Destination $hbDaemon -Force -ErrorAction Stop
      return
    } catch {
      Start-Sleep -Milliseconds (100 * ($i + 1))
    }
  }
}

if (!(Test-Path -LiteralPath $scriptPath)) {
  Write-Error "Missing executor script: $scriptPath"
  exit 1
}

if (!(Test-Path -LiteralPath (Join-Path $executorDir "node_modules"))) {
  Write-Output "EXECUTOR_SETUP_REQUIRED: run npm install in $executorDir"
  Write-DaemonHeartbeat "SETUP_REQUIRED" "npm install required in cursor-inbox-executor/"
  exit 2
}

Write-DaemonHeartbeat "RUNNING" "Daemon polling; LLM only on PREPARED pickup. Human alert: CURSOR_EXECUTOR_ALERT.md + cursor-executor-health.ps1"

while ($true) {
  foreach ($lane in ($Lanes -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })) {
    Reconcile-StaleLocalMirror $lane
  }
  $nodeArgs = @(
    $scriptPath,
    "--lanes", $Lanes,
    "--cooldown-minutes", "$CooldownMinutes",
    "--invoke-timeout-minutes", "$InvokeTimeoutMinutes"
  )
  try {
    $timeoutMs = [Math]::Max(1, $InvokeTimeoutMinutes) * 60 * 1000
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "node"
    $psi.Arguments = ($nodeArgs | ForEach-Object {
      if ($_ -match '\s') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join ' '
    $psi.WorkingDirectory = $auditDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    if ($env:CURSOR_API_KEY) {
      $psi.EnvironmentVariables["CURSOR_API_KEY"] = $env:CURSOR_API_KEY
    }
    $proc = [System.Diagnostics.Process]::Start($psi)
    if (-not $proc.WaitForExit($timeoutMs)) {
      try { $proc.Kill() } catch { }
      Start-Sleep -Milliseconds 500
      & taskkill.exe /T /F /PID $proc.Id 2>$null | Out-Null
      Write-Output "EXECUTOR_TICK_TIMEOUT $((Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK')) killed hung node pid=$($proc.Id)"
      Write-DaemonHeartbeat "RUNNING" "Recovered from hung Agent invoke; continuing poll loop."
    } else {
      $stdout = $proc.StandardOutput.ReadToEnd()
      $stderr = $proc.StandardError.ReadToEnd()
      $code = $proc.ExitCode
      Write-Output "EXECUTOR_TICK $((Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK')) exit=$code"
      if ($stdout) { Write-Output $stdout }
      if ($stderr) { Write-Output $stderr }
      Write-DaemonHeartbeat "RUNNING" "Last tick exit=$code; LLM only on PREPARED pickup."
    }
  } catch {
    Write-Output "EXECUTOR_TICK_ERROR $($_.Exception.Message)"
    Write-DaemonHeartbeat "RUNNING" "Tick error; continuing. $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $PollSeconds
}
