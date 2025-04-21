<?php
header('Content-Type: application/json');
$dir = './';
$files = array_diff(scandir($dir), array('.', '..', 'songs.json', 'list.php'));
$songs = [];
foreach ($files as $file) {
  if (pathinfo($file, PATHINFO_EXTENSION) === 'mp3') {
    $songs[] = [
      'title' => pathinfo($file, PATHINFO_FILENAME),
      'file' => $file,
      'artist' => 'Unknown', // You’d need metadata extraction for this
      'lyrics' => '' // You’d need metadata extraction for this
    ];
  }
}
echo json_encode(['songs' => $songs]);
?>
