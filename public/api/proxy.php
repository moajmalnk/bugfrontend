<?php
/**
 * Why: bugs.bugricer.com → bugbackend.bugricer.com is cross-origin. When Cloudflare
 * or some Wi-Fi block OPTIONS / return 522 HTML, the browser reports CORS instead
 * of the real error. Same-origin /api avoids preflight entirely.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$backendOrigin = 'https://bugbackend.bugricer.com';

$uri = $_SERVER['REQUEST_URI'] ?? '/api';
$path = parse_url($uri, PHP_URL_PATH) ?: '/api';
if (!preg_match('#^/api(/[A-Za-z0-9._/-]*)?$#', $path)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid API path']);
    exit;
}

$query = $_SERVER['QUERY_STRING'] ?? '';
$target = $backendOrigin . $path;
if ($query !== '') {
    $target .= '?' . $query;
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

$hopByHop = [
    'host' => true,
    'connection' => true,
    'keep-alive' => true,
    'transfer-encoding' => true,
    'te' => true,
    'trailer' => true,
    'upgrade' => true,
    'content-length' => true,
    'accept-encoding' => true,
    'cookie' => true,
    'origin' => true,
    'referer' => true,
];

$forward = [];
foreach (bugricer_request_headers() as $name => $value) {
    $key = strtolower($name);
    if (isset($hopByHop[$key])) {
        continue;
    }
    $forward[] = $name . ': ' . $value;
}

$clientIp = $_SERVER['HTTP_CF_CONNECTING_IP']
    ?? $_SERVER['HTTP_X_FORWARDED_FOR']
    ?? $_SERVER['REMOTE_ADDR']
    ?? '';
if ($clientIp !== '') {
    $forward[] = 'X-Forwarded-For: ' . $clientIp;
}
$forward[] = 'X-Forwarded-Proto: https';
$forward[] = 'X-Forwarded-Host: bugs.bugricer.com';

if (!function_exists('curl_init')) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => 'API proxy requires PHP curl.']);
    exit;
}

$ch = curl_init($target);
if ($ch === false) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => 'Could not start API proxy.']);
    exit;
}

curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 20,
    CURLOPT_HTTPHEADER => $forward,
    CURLOPT_ENCODING => '',
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);

if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$raw = curl_exec($ch);
$curlErr = curl_error($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

if ($raw === false) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'message' => 'Cannot reach the API server. Try again in a moment.',
        'detail' => $curlErr !== '' ? $curlErr : null,
    ]);
    exit;
}

$headerBlob = substr($raw, 0, $headerSize);
$body = substr($raw, $headerSize);
http_response_code($status > 0 ? $status : 502);

$allowedOut = [
    'content-type' => true,
    'content-disposition' => true,
    'cache-control' => true,
    'expires' => true,
    'pragma' => true,
    'etag' => true,
    'last-modified' => true,
    'www-authenticate' => true,
];

foreach (preg_split("/\r\n|\n|\r/", $headerBlob) as $line) {
    if (strpos($line, ':') === false) {
        continue;
    }
    [$name, $value] = explode(':', $line, 2);
    $key = strtolower(trim($name));
    if (!isset($allowedOut[$key])) {
        continue;
    }
    header(trim($name) . ': ' . trim($value), false);
}

echo $body;

/**
 * @return array<string, string>
 */
function bugricer_request_headers(): array
{
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            return $headers;
        }
    }
    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') !== 0) {
            continue;
        }
        $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
        $headers[$name] = (string) $value;
    }
    if (!empty($_SERVER['CONTENT_TYPE'])) {
        $headers['Content-Type'] = (string) $_SERVER['CONTENT_TYPE'];
    }
    return $headers;
}
