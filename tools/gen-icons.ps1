# gen-icons.ps1 — génère les icônes PNG de la PWA (même design que icon.svg)
# avec WPF, intégré à Windows : aucune dépendance, gratuit (BIBLE règle 1).
# Usage : powershell -ExecutionPolicy Bypass -File tools\gen-icons.ps1
# Produit : app/assets/icons/icon-192.png, icon-512.png, icon-512-maskable.png
# (maskable = fond plein cadre + contenu dans la zone sûre de 80 %, pour Android)

Add-Type -AssemblyName PresentationCore, WindowsBase

$dossier = Join-Path $PSScriptRoot '..\app\assets\icons'

function New-Icone([int]$taille, [bool]$maskable, [string]$nom) {
  $dv = [System.Windows.Media.DrawingVisual]::new()
  $dc = $dv.RenderOpen()

  $c1 = [System.Windows.Media.Color]::FromRgb(0x1D, 0x5F, 0xD6)
  $c2 = [System.Windows.Media.Color]::FromRgb(0x15, 0x45, 0x9C)
  $p1 = [System.Windows.Point]::new(0, 0)
  $p2 = [System.Windows.Point]::new(1, 1)
  $grad = [System.Windows.Media.LinearGradientBrush]::new($c1, $c2, $p1, $p2)
  $rect = [System.Windows.Rect]::new(0, 0, $taille, $taille)

  if ($maskable) {
    # Plein cadre : le système (Android) applique son propre masque.
    $dc.DrawRectangle($grad, $null, $rect)
    $k = 0.78  # contenu réduit dans la zone sûre
  } else {
    $r = $taille * 0.1875
    $dc.DrawRoundedRectangle($grad, $null, $rect, $r, $r)
    $k = 1.0
  }

  $centre = $taille / 2.0

  # Ligne « carnet » (en haut)
  $lw = $taille * 0.508 * $k
  $lh = [Math]::Max(2.0, $taille * 0.031 * $k)
  $ly = $centre + ($taille * 0.246 - $centre) * $k
  $blanc = [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromArgb(140, 255, 255, 255))
  $rLigne = [System.Windows.Rect]::new($centre - $lw / 2, $ly - $lh / 2, $lw, $lh)
  $dc.DrawRoundedRectangle($blanc, $null, $rLigne, $lh / 2, $lh / 2)

  # Texte « EPS »
  $ff = [System.Windows.Media.FontFamily]::new('Segoe UI')
  $tf = [System.Windows.Media.Typeface]::new($ff, [System.Windows.FontStyles]::Normal, [System.Windows.FontWeights]::ExtraBold, [System.Windows.FontStretches]::Normal)
  $ft = [System.Windows.Media.FormattedText]::new(
    'EPS',
    [System.Globalization.CultureInfo]::InvariantCulture,
    [System.Windows.FlowDirection]::LeftToRight,
    $tf,
    ($taille * 0.30 * $k),
    [System.Windows.Media.Brushes]::White,
    1.25
  )
  $ty = $centre + ($taille * 0.545 - $centre) * $k
  $dc.DrawText($ft, [System.Windows.Point]::new($centre - $ft.Width / 2, $ty - $ft.Height / 2))

  # Point jaune (en bas)
  $jaune = [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(0xFF, 0xD3, 0x4D))
  $py = $centre + ($taille * 0.773 - $centre) * $k
  $rayon = $taille * 0.031 * $k
  $dc.DrawEllipse($jaune, $null, [System.Windows.Point]::new($centre, $py), $rayon, $rayon)

  $dc.Close()

  $rtb = [System.Windows.Media.Imaging.RenderTargetBitmap]::new($taille, $taille, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
  $rtb.Render($dv)
  $enc = [System.Windows.Media.Imaging.PngBitmapEncoder]::new()
  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rtb))
  $chemin = Join-Path $dossier $nom
  $fs = [IO.File]::Create($chemin)
  $enc.Save($fs)
  $fs.Close()
  Write-Output ('OK {0} ({1} octets)' -f $nom, (Get-Item $chemin).Length)
}

New-Icone 192 $false 'icon-192.png'
New-Icone 512 $false 'icon-512.png'
New-Icone 512 $true  'icon-512-maskable.png'
