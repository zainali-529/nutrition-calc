Add-Type -AssemblyName System.Drawing

$srcPath = "f:\calculator\nutrition-calc\public\rumicalc-logo.png"
$resDir = "f:\calculator\nutrition-calc\android\app\src\main\res"

$sizes = [ordered]@{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

foreach ($folder in $sizes.Keys) {
    $dim = $sizes[$folder]
    $targetFolder = Join-Path $resDir $folder
    if (!(Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder | Out-Null
    }

    $destImg = New-Object System.Drawing.Bitmap($dim, $dim)
    $g = [System.Drawing.Graphics]::FromImage($destImg)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $dim, $dim)
    $g.Dispose()

    foreach ($filename in @("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png")) {
        $outPath = Join-Path $targetFolder $filename
        if (Test-Path $outPath) { Remove-Item $outPath -Force }
        $destImg.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "Generated: $outPath ($dim x $dim)"
    }
    $destImg.Dispose()
}

$srcImg.Dispose()
Write-Host "All Android icons successfully created from rumicalc-logo.png!"
