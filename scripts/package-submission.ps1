$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$allowedDirectories = @('app','components','lib','database','scripts','tests','docs')
$rootFiles = @('.env.example','.gitignore','README.md','package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.mjs','vitest.config.ts','middleware.ts')
$excludedScripts = @('read-requirements.py','prepare-lock.mjs','inspect-db.mjs')
$selected = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
foreach ($name in $allowedDirectories) {
    foreach ($item in Get-ChildItem -LiteralPath (Join-Path $projectRoot $name) -File -Recurse) {
        $relative = $item.FullName.Substring($projectRoot.Length + 1).Replace('\','/')
        if ($relative -match '(^|/)(node_modules|\.git|\.next|\.next-dev|__pycache__|coverage)(/|$)') { continue }
        if ($item.Name -match '^\.env(?:\.|$)' -or $item.Name -match '\.(pyc|tsbuildinfo|tmp|bak)$') { continue }
        if ($name -eq 'scripts' -and $item.Name -in $excludedScripts) { continue }
        if ($item.Extension -eq '.log' -and -not $relative.StartsWith('docs/testing/results/')) { continue }
        if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw "Linked file not allowed: $relative" }
        $selected.Add($item)
    }
}
foreach ($name in $rootFiles) { $selected.Add((Get-Item -LiteralPath (Join-Path $projectRoot $name))) }
$required = @('docs/FINAL_REPORT.md','docs/Campus_Lost_Found_Final_Report.pdf','docs/design/Relational_Schema.docx','docs/design/Relational_Schema.pdf','docs/FINAL_AUDIT.md','docs/testing/results/secret-scan.json','docs/screenshots/14-found-report-form.jpg')
$relativeFiles = @($selected | ForEach-Object { $_.FullName.Substring($projectRoot.Length + 1).Replace('\','/') })
foreach ($path in $required) { if ($path -notin $relativeFiles) { throw "Missing deliverable: $path" } }
$secretResult = Get-Content -LiteralPath (Join-Path $projectRoot 'docs/testing/results/secret-scan.json') -Raw | ConvertFrom-Json
if ($secretResult.status -ne 'PASS') { throw 'Source credential audit must pass before packaging.' }
$manifest = @($selected | Sort-Object FullName | ForEach-Object {
    [ordered]@{path=$_.FullName.Substring($projectRoot.Length + 1).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
})
$deliveryDirectory = Join-Path $projectRoot 'deliverables'
$stagePath = [System.IO.Path]::GetFullPath((Join-Path $deliveryDirectory 'Submission'))
$zipPath = [System.IO.Path]::GetFullPath((Join-Path $deliveryDirectory 'Campus_Lost_Found_Submission.zip'))
$backupRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'artifacts/local/submission-cleanup/backup'))
foreach ($target in @($stagePath,$zipPath,$backupRoot)) {
    if (-not $target.StartsWith($projectRoot+[System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)) { throw 'Output path outside project.' }
}
New-Item -ItemType Directory -Force -Path $deliveryDirectory,$backupRoot | Out-Null
$stamp=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssfff')
if (Test-Path -LiteralPath $stagePath) {
    $resolvedStage=(Resolve-Path -LiteralPath $stagePath).Path
    if ($resolvedStage -ne $stagePath) { throw 'Unexpected staging target.' }
    Move-Item -LiteralPath $stagePath -Destination (Join-Path $backupRoot ("Submission-"+$stamp))
}
if (Test-Path -LiteralPath $zipPath) { Copy-Item -LiteralPath $zipPath -Destination (Join-Path $backupRoot ("Submission-"+$stamp+".zip")) }
New-Item -ItemType Directory -Force -Path $stagePath | Out-Null
foreach ($item in $selected) {
    $relative=$item.FullName.Substring($projectRoot.Length+1)
    $destination=Join-Path $stagePath $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath $item.FullName -Destination $destination
}
$manifestObject=[ordered]@{project='Campus Lost & Found Intelligent Matching System';generatedAt=[DateTime]::UtcNow.ToString('o');files=$manifest}
$manifestPath=Join-Path $stagePath 'SUBMISSION_MANIFEST.json'
$manifestObject | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding utf8
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Get-ArchiveEntryHash($entry) {
    $stream=$entry.Open()
    $hasher=[System.Security.Cryptography.SHA256]::Create()
    try { $digest=$hasher.ComputeHash($stream); return (-join ($digest | ForEach-Object { $_.ToString('x2') })) }
    finally { $stream.Dispose(); $hasher.Dispose() }
}
$baselinePath=Join-Path $backupRoot 'Campus_Lost_Found_Submission_previous.zip'
$coreCompared=0
$coreChanged=[System.Collections.Generic.List[string]]::new()
$formattingChanges=[System.Collections.Generic.List[string]]::new()
$formattingEvidencePath=Join-Path $projectRoot 'docs/testing/results/source-formatting.json'
$formattingProofs=@()
if (Test-Path -LiteralPath $formattingEvidencePath) {
    $formattingProofs=@((Get-Content -LiteralPath $formattingEvidencePath -Raw | ConvertFrom-Json).files)
}
if (Test-Path -LiteralPath $baselinePath) {
    $baseline=[System.IO.Compression.ZipFile]::OpenRead($baselinePath)
    try {
        foreach ($record in $manifest) {
            if ($record.path -match '^(app|components|lib|database)/' -or $record.path -in @('middleware.ts','package.json','package-lock.json','docs/design/ER_Diagram.png','docs/design/ER_Diagram.drawio')) {
                $entry=$baseline.GetEntry($record.path)
                if ($null -eq $entry) { $coreChanged.Add($record.path); continue }
                $coreCompared++
                $originalHash=Get-ArchiveEntryHash $entry
                if ($originalHash -ne $record.sha256) {
                    $proof=@($formattingProofs | Where-Object {
                        $_.path -eq $record.path -and $_.originalSha256 -eq $originalHash -and
                        $_.currentSha256 -eq $record.sha256 -and $_.formattingOnly -eq $true -and
                        $_.modelDefinitionsIdentical -eq $true -and $_.programStructureIdentical -eq $true -and
                        $_.originalProgramStructureSha256 -eq $_.currentProgramStructureSha256
                    })
                    if ($proof.Count -eq 1) { $formattingChanges.Add($record.path) }
                    else { $coreChanged.Add($record.path) }
                }
            }
        }
    } finally { $baseline.Dispose() }
}
if ($coreChanged.Count -gt 0) { throw ('Working source/ER differs from cleanup baseline: '+($coreChanged -join ', ')) }
$tempZip=Join-Path $deliveryDirectory ("Submission-"+$stamp+".tmp.zip")
[System.IO.Compression.ZipFile]::CreateFromDirectory($stagePath,$tempZip,[System.IO.Compression.CompressionLevel]::Optimal,$false)
$archive=[System.IO.Compression.ZipFile]::OpenRead($tempZip)
try {
    if ($archive.Entries.Count -ne ($selected.Count+1)) { throw 'ZIP file count mismatch.' }
    foreach ($entry in $archive.Entries) {
        if ($entry.FullName -match '(^|/)(\.git|node_modules|\.next|\.next-dev|__pycache__)(/|$)' -or ($entry.Name -match '^\.env(?:\.|$)' -and $entry.FullName -ne '.env.example')) { throw 'Private/generated archive path.' }
    }
    foreach ($record in $manifest) {
        $entry=$archive.GetEntry($record.path)
        if ($null -eq $entry -or (Get-ArchiveEntryHash $entry) -ne $record.sha256) { throw ('ZIP hash mismatch: '+$record.path) }
        if ((Get-FileHash -LiteralPath (Join-Path $stagePath $record.path) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $record.sha256) { throw ('Staged hash mismatch: '+$record.path) }
    }
    if ((Get-ArchiveEntryHash ($archive.GetEntry('SUBMISSION_MANIFEST.json'))) -ne (Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant()) { throw 'Manifest hash mismatch.' }
} finally { $archive.Dispose() }
Move-Item -LiteralPath $tempZip -Destination $zipPath -Force
$zipHash=(Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath ($zipPath+'.sha256') -Value ($zipHash+'  Campus_Lost_Found_Submission.zip') -Encoding utf8
$verification=[ordered]@{verifiedAt=[DateTime]::UtcNow.ToString('o');status='PASS';sourceFiles=$selected.Count;archiveEntries=$selected.Count+1;zipSha256=$zipHash;stagedAndDecompressedHashes='PASS';excludedCredentialsAndGeneratedFiles='PASS';coreAndApprovedERComparedWithPreviousArchive=$coreCompared;coreChanges=$coreChanged.Count;verifiedFormattingOnlyChanges=$formattingChanges.Count;formattingOnlyFiles=@($formattingChanges);stage='Submission';archive='Campus_Lost_Found_Submission.zip'}
$verification | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $deliveryDirectory 'packaging-verification.json') -Encoding utf8
Write-Output ("Created clean folder and ZIP: {0} source/evidence files, {1} bytes; all staged/ZIP hashes verified; {2} core/design files compared; {3} verified formatting-only changes." -f $selected.Count,(Get-Item -LiteralPath $zipPath).Length,$coreCompared,$formattingChanges.Count)
