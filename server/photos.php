<?php
// Field Day: everyone's photo wall, for your own website.
// Put this file next to field-day.html (same folder), beside records.php. The game finds it on its own: photos
// people take then go up on the clubhouse's "Everyone's photos" wall for everyone who plays on your site, and stay.
// The pictures are kept in a folder called photos (made on first use), with photos.json listing them and their hearts.
// PHP must be allowed to write in this folder.
//   GET  photos.php?op=list&dev=ID   -> { ok, photos: [{ id, n, t, h, m }], mine: [ids this device gave a heart] }
//   GET  photos.php?img=ID           -> the picture (a jpeg)
//   POST { op: 'add', dev, n, img }  -> { ok, id }      (img: a jpeg data URL)
//   POST { op: 'del', dev, id }      -> removes one of that device's own
//   POST { op: 'like', dev, id, on } -> a heart, or taking it back
$DIR = __DIR__ . '/photos';
$FILE = __DIR__ . '/photos.json';
$PER_DEVICE = 24;     // each device's most recent; past this its oldest with the fewest hearts goes
$MAX_PHOTOS = 400;    // all together; past this the oldest with the fewest hearts goes
$MAX_BYTES = 200000;  // one picture

function bad($code, $msg) { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); echo json_encode(['ok' => false, 'error' => $msg]); exit; }
function ok_id($id) { return is_string($id) && preg_match('/^[a-z0-9]{6,40}$/', $id); }
function ok_dev($d) { return is_string($d) && preg_match('/^[a-z0-9]{12,32}$/', $d); }

// the picture itself
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['img'])) {
  $id = (string) $_GET['img'];
  if (!ok_id($id) || !is_file("$DIR/$id.jpg")) bad(404, 'no such photo');
  header('Content-Type: image/jpeg');
  header('Cache-Control: public, max-age=604800');
  readfile("$DIR/$id.jpg");
  exit;
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function load_all($file) {
  if (!file_exists($file)) return ['photos' => [], 'likes' => []];
  $j = json_decode((string) @file_get_contents($file), true);
  if (!is_array($j)) $j = [];
  if (!isset($j['photos']) || !is_array($j['photos'])) $j['photos'] = [];
  if (!isset($j['likes']) || !is_array($j['likes'])) $j['likes'] = [];
  return $j;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $dev = isset($_GET['dev']) ? (string) $_GET['dev'] : '';
  $all = load_all($FILE);
  $out = []; $mine = [];
  foreach ($all['photos'] as $id => $p) {
    $likes = isset($all['likes'][$id]) && is_array($all['likes'][$id]) ? $all['likes'][$id] : [];
    $out[] = ['id' => $id, 'n' => $p['n'], 't' => $p['t'], 'h' => count($likes), 'm' => ($dev !== '' && $p['d'] === $dev) ? 1 : 0];
    if ($dev !== '' && in_array($dev, $likes, true)) $mine[] = $id;
  }
  echo json_encode(['ok' => true, 'photos' => $out, 'mine' => $mine]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') bad(405, 'GET or POST');
$raw = file_get_contents('php://input', false, null, 0, 400000);
$in = json_decode((string) $raw, true);
if (!is_array($in)) bad(400, 'bad json');
$op = isset($in['op']) ? (string) $in['op'] : '';
$dev = isset($in['dev']) ? (string) $in['dev'] : '';
if (!ok_dev($dev)) bad(400, 'bad device');

// a new picture: check it really is a modest jpeg before keeping it
$jpeg = null;
if ($op === 'add') {
  $img = isset($in['img']) ? (string) $in['img'] : '';
  if (strpos($img, 'data:image/jpeg;base64,') !== 0) bad(400, 'not a jpeg');
  $jpeg = base64_decode(substr($img, 23), true);
  if ($jpeg === false || strlen($jpeg) < 200 || strlen($jpeg) > $MAX_BYTES || substr($jpeg, 0, 2) !== "\xFF\xD8") bad(400, 'not a jpeg');
  if (!is_dir($DIR) && !@mkdir($DIR, 0755)) bad(500, 'cannot make the photos folder');
}

// read, change and write under a lock, so two at once don't lose each other
$fp = fopen($FILE, 'c+');
if (!$fp) bad(500, 'cannot write photos.json');
flock($fp, LOCK_EX);
$all = json_decode((string) stream_get_contents($fp), true);
if (!is_array($all)) $all = [];
if (!isset($all['photos']) || !is_array($all['photos'])) $all['photos'] = [];
if (!isset($all['likes']) || !is_array($all['likes'])) $all['likes'] = [];
$reply = ['ok' => true];

function hearts($all, $id) { return isset($all['likes'][$id]) && is_array($all['likes'][$id]) ? count($all['likes'][$id]) : 0; }
// the one to let go of, among these: the fewest hearts, then the oldest
function weakest($all, $ids) {
  usort($ids, function ($a, $b) use ($all) { return (hearts($all, $a) <=> hearts($all, $b)) ?: ($all['photos'][$a]['t'] <=> $all['photos'][$b]['t']); });
  return $ids[0];
}
function drop(&$all, $id, $DIR) { unset($all['photos'][$id]); unset($all['likes'][$id]); @unlink("$DIR/$id.jpg"); }

if ($op === 'add') {
  $name = isset($in['n']) ? trim(strip_tags((string) $in['n'])) : '';
  $name = mb_substr(preg_replace('/[\x00-\x1F\x7F]/u', '', $name), 0, 24);
  if ($name === '') $name = 'Player';
  $id = base_convert((string) time(), 10, 36) . bin2hex(random_bytes(5));
  if (@file_put_contents("$DIR/$id.jpg", $jpeg) === false) { flock($fp, LOCK_UN); fclose($fp); bad(500, 'cannot save the photo'); }
  $all['photos'][$id] = ['d' => $dev, 'n' => $name, 't' => time()];
  $theirs = array_keys(array_filter($all['photos'], function ($p) use ($dev) { return $p['d'] === $dev; }));
  while (count($theirs) > $PER_DEVICE) { $w = weakest($all, array_values(array_diff($theirs, [$id]))); drop($all, $w, $DIR); $theirs = array_values(array_diff($theirs, [$w])); }
  while (count($all['photos']) > $MAX_PHOTOS) { $w = weakest($all, array_values(array_diff(array_keys($all['photos']), [$id]))); drop($all, $w, $DIR); }
  $reply['id'] = $id;
} elseif ($op === 'del') {
  $id = isset($in['id']) ? (string) $in['id'] : '';
  if (ok_id($id) && isset($all['photos'][$id]) && $all['photos'][$id]['d'] === $dev) drop($all, $id, $DIR);
} elseif ($op === 'like') {
  $id = isset($in['id']) ? (string) $in['id'] : '';
  if (ok_id($id) && isset($all['photos'][$id])) {
    $l = isset($all['likes'][$id]) && is_array($all['likes'][$id]) ? $all['likes'][$id] : [];
    $l = array_values(array_diff($l, [$dev]));
    if (!empty($in['on'])) $l[] = $dev;
    $all['likes'][$id] = $l;
  }
} else {
  flock($fp, LOCK_UN); fclose($fp); bad(400, 'unknown op');
}

ftruncate($fp, 0); rewind($fp);
fwrite($fp, json_encode($all));
fflush($fp); flock($fp, LOCK_UN); fclose($fp);
echo json_encode($reply);
