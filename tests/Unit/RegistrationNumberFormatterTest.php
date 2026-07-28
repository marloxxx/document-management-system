<?php

namespace Tests\Unit;

use App\Helpers\RegistrationNumberFormatter;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RegistrationNumberFormatterTest extends TestCase
{
    #[DataProvider('formatProvider')]
    public function test_formats_registration_number(int $seq, string $expected): void
    {
        $this->assertSame($expected, RegistrationNumberFormatter::format($seq, 7, 2026));
    }

    public static function formatProvider(): array
    {
        return [
            'first number' => [1, '01/VII/2026'],
            '99 padded' => [99, '99/VII/2026'],
            'last without prefix' => [500, '500/VII/2026'],
            'first with prefix A' => [501, 'A01/VII/2026'],
            'middle block A' => [750, 'A250/VII/2026'],
            'last block A' => [1000, 'A500/VII/2026'],
            'first block B' => [1001, 'B01/VII/2026'],
            'last block B' => [1500, 'B500/VII/2026'],
            'first block Z' => [13001, 'Z01/VII/2026'],
            'last block Z' => [13000, 'Y500/VII/2026'],
            'maximum supported' => [13500, 'Z500/VII/2026'],
        ];
    }

    public function test_rejects_sequence_below_one(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        RegistrationNumberFormatter::format(0, 7, 2026);
    }

    public function test_rejects_sequence_above_maximum(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        RegistrationNumberFormatter::format(13501, 7, 2026);
    }
}
