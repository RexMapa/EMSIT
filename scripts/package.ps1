$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputFile = Join-Path (Split-Path $projectRoot -Parent) 'EMSIT-Web-App-Neumorphic.zip'
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $outputFile) { Remove-Item -LiteralPath $outputFile }
$archive = [IO.Compression.ZipFile]::Open($outputFile,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($entry in @('api','lib','public','database','scripts','tests','.github','package.json','package-lock.json','vercel.json','.gitignore','.env.example','README.md','BRAND-IMPLEMENTATION.md')) {
    $item=Get-Item -LiteralPath (Join-Path $projectRoot $entry) -Force
    $files=if($item.PSIsContainer){Get-ChildItem -LiteralPath $item.FullName -File -Recurse -Force}else{@($item)}
    foreach($file in $files){
      $relative=$file.FullName.Substring($projectRoot.Length+1).Replace('\','/')
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,$relative)|Out-Null
    }
  }
} finally {$archive.Dispose()}
Write-Output $outputFile
