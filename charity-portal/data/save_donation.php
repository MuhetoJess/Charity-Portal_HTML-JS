<?php
/**
 * save_donation.php
 * Appends a new pledge to donations.json and writes the file back to
 * disk, so a donor's pledge shows up for everyone (including the
 * charity's dashboard) - not just in the browser that submitted it.
 *
 * Demo-level endpoint: no auth, minimal validation. Fine for
 * coursework with dummy data; a real deployment should verify the
 * donor is actually logged in server-side before accepting a pledge.
 */

header('Content-Type: application/json');

$dataFile = __DIR__ . '/donations.json';

$input = json_decode(file_get_contents('php://input'), true);

$requiredFields = ['donorId', 'donorName', 'charityId', 'charityName', 'amount'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || $input[$field] === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => "Missing field: $field"]);
        exit;
    }
}

$amount = filter_var($input['amount'], FILTER_VALIDATE_FLOAT);
if ($amount === false || $amount < 1000) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Amount must be a number of at least 1000.']);
    exit;
}

$fp = fopen($dataFile, 'c+');
if (!$fp || !flock($fp, LOCK_EX)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not open donations.json for writing. Check file permissions.']);
    exit;
}

$contents = stream_get_contents($fp);
$donations = json_decode($contents, true);
if (!is_array($donations)) {
    $donations = [];
}

// Next numeric id = highest existing id + 1
$nextId = 1;
foreach ($donations as $d) {
    if (isset($d['id']) && is_numeric($d['id'])) {
        $nextId = max($nextId, (int) $d['id'] + 1);
    }
}

$donation = [
    'id'          => $nextId,
    'donorId'     => $input['donorId'],
    'donorName'   => $input['donorName'],
    'charityId'   => $input['charityId'],
    'charityName' => $input['charityName'],
    'amount'      => $amount,
    'date'        => date('Y-m-d'),
    'status'      => 'Pending',
    'note'        => isset($input['note']) ? trim((string) $input['note']) : '',
];

$donations[] = $donation;

ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($donations, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['ok' => true, 'donation' => $donation]);
