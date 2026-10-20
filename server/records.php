<?php
// Field Day: the shared records board for your own website.
// Put this file next to field-day.html (same folder). The game finds it on its own: everyone who plays on your
// site then shares one set of records boards. Each device keeps one entry: its player's best for every record.
// Scores live in records.json beside this file (created on first use; PHP must be allowed to write in the folder).
//   GET  records.php          -> { ok: true, players: { id: { n: name, b: { "game.key": value }, t: time } } }
//   POST records.php  { id, n, b }  -> saves that device's bests
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$FILE = __DIR__ . '/records.json';
$MAX_PLAYERS = 3000;      // the oldest entries go first past this
$MAX_KEYS = 300;          // records per player

function load_all($file) {
  if (!file_exists($file)) return [];
  $j = json_decode((string) @file_get_contents($file), true);
  return is_array($j) ? $j : [];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  echo json_encode(['ok' => true, 'players' => (object) load_all($FILE)]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }

$raw = file_get_contents('php://input', false, null, 0, 65536);
$in = json_decode((string) $raw, true);
if (!is_array($in)) { http_response_code(400); echo '{"ok":false,"error":"bad json"}'; exit; }

$id = isset($in['id']) ? (string) $in['id'] : '';
if (!preg_match('/^[a-z0-9]{12,32}$/', $id)) { http_response_code(400); echo '{"ok":false,"error":"bad id"}'; exit; }
$name = isset($in['n']) ? trim(strip_tags((string) $in['n'])) : '';
$name = mb_substr(preg_replace('/[\x00-\x1F\x7F]/u', '', $name), 0, 24);
if ($name === '') $name = 'Player';
$best = [];
if (isset($in['b']) && is_array($in['b'])) {
  foreach ($in['b'] as $k => $v) {
    if (count($best) >= $MAX_KEYS) break;
    if (!is_string($k) || !preg_match('/^[a-z0-9_-]{1,24}\.[a-z0-9_-]{1,24}$/i', $k)) continue;
    if (!is_int($v) && !is_float($v)) continue;
    if (!is_finite($v) || $v < 0 || $v > 1e7) continue;
    $best[$k] = round($v, 2);
  }
}

// read, change and write under a lock, so two saves at once don't lose each other
$fp = fopen($FILE, 'c+');
if (!$fp) { http_response_code(500); echo '{"ok":false,"error":"cannot write records.json"}'; exit; }
flock($fp, LOCK_EX);
$all = json_decode((string) stream_get_contents($fp), true);
if (!is_array($all)) $all = [];
$all[$id] = ['n' => $name, 'b' => (object) $best, 't' => time()];
if (count($all) > $MAX_PLAYERS) {
  uasort($all, function ($a, $b) { return ($b['t'] ?? 0) <=> ($a['t'] ?? 0); });
  $all = array_slice($all, 0, $MAX_PLAYERS, true);
}
ftruncate($fp, 0); rewind($fp);
fwrite($fp, json_encode($all));
fflush($fp); flock($fp, LOCK_UN); fclose($fp);
echo '{"ok":true}';
