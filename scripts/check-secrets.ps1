<#
.SYNOPSIS
Validates that secrets are not tracked by git.

.DESCRIPTION
Checks for the presence of .env.production and common secret prefixes (sk_live_, whsec_, etc.)
in the git repository. Fails the build if found.
#>

$ErrorActionPreference = "Stop"

Write-Host "Running secret hygiene check..."

$exitCode = 0

# 1. Check for tracked .env files that shouldn't be there
$envFiles = git ls-files | Select-String -Pattern "\.env\.production$" | ForEach-Object { $_.Line }
if ($envFiles.Count -gt 0) {
    Write-Host "::error::Found tracked .env.production file(s):"
    foreach ($file in $envFiles) {
        Write-Host "  $file"
    }
    Write-Host "::error::.env.production must NEVER be committed to git."
    $exitCode = 1
}

# 2. Check for secret prefixes in tracked files
$secretPatterns = @(
    "sk_live_",
    "sk_test_",
    "whsec_",
    "gsk_"
)

foreach ($pattern in $secretPatterns) {
    # git grep returns exit code 1 if no matches found, which is what we want.
    # We'll suppress errors and handle it manually.
    $matches = git grep -n "$pattern" -- ":!tests/*" ":!app/config.py" ":!frontend/lib/supabase.ts" ":!.env.example" ":!.github/*" 2>$null
    if ($LASTEXITCODE -eq 0 -and $matches) {
        Write-Host "::error::Found possible secret pattern '$pattern' in tracked files:"
        Write-Host $matches
        Write-Host "::error::Please remove real secrets and use placeholders."
        $exitCode = 1
    }
}

# 3. Check for real Supabase URLs (non-dummy)
$dummyUrl = "https://dummyprojectref.supabase.co"
$supabaseMatches = git grep -n "https://.*\.supabase\.co" -- ":!tests/*" ":!app/config.py" ":!frontend/lib/supabase.ts" ":!.env.example" ":!.github/*" 2>$null
if ($LASTEXITCODE -eq 0 -and $supabaseMatches) {
    $realUrls = $supabaseMatches | Where-Object { $_ -notmatch [regex]::Escape($dummyUrl) }
    if ($realUrls) {
        Write-Host "::error::Found real Supabase URL in tracked files:"
        Write-Host $realUrls
        Write-Host "::error::Only dummyprojectref.supabase.co should be committed."
        $exitCode = 1
    }
}

if ($exitCode -eq 0) {
    Write-Host "Secret hygiene check passed. No issues found."
} else {
    Write-Host "::error::Secret hygiene check failed. If you committed real secrets, you MUST rotate them immediately!"
    exit $exitCode
}
