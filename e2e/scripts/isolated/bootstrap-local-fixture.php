<?php

/**
 * MODE B ONLY — builds the ASSAB harness fixture inside a DISPOSABLE local
 * SQLite file so the Playwright API layer can be exercised against a real
 * Laravel process without touching staging.
 *
 * Usage (from anywhere):
 *   ASSAB_E2E_FIXTURE_PASSWORD=... php bootstrap-local-fixture.php /path/to/backend <namespace>
 *
 * Refuses unless:
 *   - APP_ENV is not staging/production;
 *   - DB_CONNECTION=sqlite and DB_DATABASE is an absolute *.sqlite file whose
 *     basename starts with "assab-e2e-" (a disposable file created by run-isolated.sh).
 *
 * It reuses the backend's own StagingHarnessProvisioner (same identities and
 * deterministic UUIDs as the staging fixture), the canonical role seeder, the
 * existing MobileCashierMirrorService (the step `asab:mirror-mobile-cashiers`
 * performs) and creates exactly one synthetic aggregator. No financial rows.
 * Prints a secret-free JSON manifest on stdout.
 */

[$script, $backend, $namespace] = $argv + [null, null, 'assab-e2e-local'];

$fail = static function (string $message): never {
    fwrite(STDERR, "REFUSED: {$message}\n");
    exit(2);
};

if (! is_string($backend) || ! is_file($backend.'/artisan')) {
    $fail('first argument must be the backend checkout (directory containing artisan).');
}
$env = getenv('APP_ENV') ?: '';
if (in_array(strtolower($env), ['staging', 'production', 'prod'], true)) {
    $fail("APP_ENV={$env} is not allowed for the isolated bootstrap.");
}
if (getenv('DB_CONNECTION') !== 'sqlite') {
    $fail('DB_CONNECTION must be sqlite.');
}
$database = (string) getenv('DB_DATABASE');
if (! str_starts_with($database, '/') || ! str_ends_with($database, '.sqlite')
    || ! str_starts_with(basename($database), 'assab-e2e-') || ! is_file($database)) {
    $fail('DB_DATABASE must be an existing absolute disposable file named assab-e2e-*.sqlite.');
}
$password = (string) getenv('ASSAB_E2E_FIXTURE_PASSWORD');
if (strlen($password) < 16) {
    $fail('ASSAB_E2E_FIXTURE_PASSWORD must be supplied via the environment (>= 16 chars).');
}
if (! preg_match('/\A[a-z0-9][a-z0-9-]{2,62}\z/', $namespace)) {
    $fail('invalid namespace.');
}

require $backend.'/vendor/autoload.php';
$app = require $backend.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$connection = Illuminate\Support\Facades\DB::connection();
if ($connection->getDriverName() !== 'sqlite' || realpath($connection->getDatabaseName()) !== realpath($database)) {
    $fail('live connection is not the disposable SQLite file.');
}

(new Modules\Admin\Database\Seeders\AsabRolePermissionSeeder())->run();
$manifest = app(Modules\Admin\Services\Testing\StagingHarnessProvisioner::class)->provision($namespace, $password);

$cashier = Modules\Cashier\Models\Cashier::query()->findOrFail($manifest['legacyDependencies']['cashierId']);
$employee = app(Modules\Admin\Services\MobileCashierMirrorService::class)->mirror($cashier);

$aggregator = Modules\Aggregator\Models\Aggregator::query()->firstOrCreate(
    ['code' => 'E2E-AGG'],
    ['name' => '[E2E] Delivery App', 'is_active' => true, 'commission_rate' => 0],
);

// Mode B only: extra synthetic shift templates so regression scenarios each get
// their own (cashier, template, date) slot. Staging fixtures do NOT have these;
// regression tests that need them report BLOCKED there.
$regressionTemplates = [];
foreach ([['[E2E-REG] 16:00-20:00', '16:00:00', '20:00:00'], ['[E2E-REG] 20:00-23:59', '20:00:00', '23:59:00']] as [$name, $start, $end]) {
    $tpl = Modules\Shift\Models\Shift::query()->firstOrNew(['branch_id' => $manifest['branchId'], 'name' => $name]);
    $tpl->forceFill(['start_time' => $start, 'end_time' => $end, 'is_active' => true, 'opening_float' => '0.00'])->save();
    $regressionTemplates[] = $tpl->id;
}

echo json_encode([
    'mode' => 'ISOLATED_LOCAL_SQLITE',
    'regressionTemplateIds' => $regressionTemplates,
    'namespace' => $manifest['namespace'],
    'companyId' => $manifest['companyId'],
    'branchId' => $manifest['branchId'],
    'branchManagerId' => $manifest['branchManagerId'],
    'cashierId' => $manifest['legacyDependencies']['cashierId'],
    'shiftTemplateId' => $manifest['legacyDependencies']['shiftTemplateId'],
    'cashierEmployeeId' => $employee?->id,
    'aggregatorId' => $aggregator->id,
    'definitionSha256' => $manifest['definitionSha256'],
    'plaintextCredentialIncluded' => false,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
