# Clip Aura Development Helper Script

function Show-Help {
    Write-Host "Clip Aura Dev Tools" -ForegroundColor Cyan
    Write-Host "-------------------"
    Write-Host "run      : Start the full stack (Docker)"
    Write-Host "stop     : Stop the stack"
    Write-Host "logs     : Stream backend logs"
    Write-Host "test     : Run smoke tests"
    Write-Host "clean    : Remove temporary outputs and caches"
}

param (
    [Parameter(Mandatory=$false)][string]$action = "help"
)

switch ($action) {
    "run" {
        docker-compose up --build -d
        Write-Host "🚀 Stack is starting at http://localhost:8000" -ForegroundColor Green
    }
    "stop" {
        docker-compose down
        Write-Host "🛑 Stack stopped" -ForegroundColor Yellow
    }
    "logs" {
        docker-compose logs -f web
    }
    "test" {
        python .\scripts\smoke_test.py
    }
    "clean" {
        Remove-Item -Recurse -Force .\outputs\* -ErrorAction SilentlyContinue
        Write-Host "🧹 Outputs cleaned" -ForegroundColor Green
    }
    Default {
        Show-Help
    }
}
