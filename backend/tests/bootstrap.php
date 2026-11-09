<?php

$testApplicationKey = 'base64:'.base64_encode(random_bytes(32));

putenv('APP_KEY='.$testApplicationKey);
$_ENV['APP_KEY'] = $testApplicationKey;
$_SERVER['APP_KEY'] = $testApplicationKey;

require dirname(__DIR__).'/vendor/autoload.php';
