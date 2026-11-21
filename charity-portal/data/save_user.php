<?php
/**
 * save_user.php
 * Appends a new donor or charity account to users.json and writes the
 * file back to disk, so registrations survive a page reload / a new
 * browser / another computer on the network - not just this session.
 *
 * This is a demo-level endpoint: no auth, no hashing, minimal
 * validation. Fine for coursework with dummy data; do not deploy this
 * as-is once real user data or a real database is involved.
 */

header('Content-Type: application/json');

$dataFile = __DIR__ . '/users.json';

// ---- read & validate the incoming request ----
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['role']) || !isset($input['user']) || !is_array($input['user'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Request must include "role" and a "user" object.']);
    exit;
}

$role = ($input['role'] === 'charity') ? 'charities' : 'donors';
$user = $input['user'];

$requiredFields = ($role === 'charities')
    ? ['name', 'email', 'password', 'regNumber', 'category']
    : ['name', 'email', 'password', 'phone'];

foreach ($requiredFields as $field) {
    if (empty($user[$field])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => "Missing field: $field"]);
        exit;
    }
}

if (!filter_var($user['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Please provide a valid email address.']);
    exit;
}

// ---- open users.json with an exclusive lock so two saves at once can't clobber each other ----
$fp = fopen($dataFile, 'c+');
if (!$fp || !flock($fp, LOCK_EX)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not open users.json for writing. Check file permissions.']);
    exit;
}

$contents = stream_get_contents($fp);
$data = json_decode($contents, true);
if (!is_array($data) || !isset($data['donors']) || !isset($data['charities'])) {
    $data = ['donors' => [], 'charities' => []];
}

// Reject a duplicate email within the same role
foreach ($data[$role] as $existing) {
    if (isset($existing['email']) && strcasecmp($existing['email'], $user['email']) === 0) {
        flock($fp, LOCK_UN);
        fclose($fp);
        http_response_code(409);
        echo json_encode(['ok' => false, 'error' => 'An account with that email already exists.']);
        exit;
    }
}

// Server assigns the id and join date, same as the old localStorage version did
$user['id'] = ($role === 'charities' ? 'c-' : 'd-') . time() . '-' . bin2hex(random_bytes(2));
$user['joined'] = date('Y-m-d');

// Keep field order tidy/consistent
if ($role === 'donors') {
    $user = [
        'id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'],
        'password' => $user['password'], 'phone' => $user['phone'], 'joined' => $user['joined'],
    ];
} else {
    $user = [
        'id' => $user['id'], 'name' => $user['name'], 'regNumber' => $user['regNumber'],
        'email' => $user['email'], 'password' => $user['password'],
        'category' => $user['category'], 'joined' => $user['joined'],
    ];
}

$data[$role][] = $user;

// ---- write the whole file back ----
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['ok' => true, 'user' => $user]);
