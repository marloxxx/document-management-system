<?php

namespace App\Helpers;

class RegistrationNumberFormatter
{
    public const BLOCK_SIZE = 500;

    /** Maximum seq per month: 500 (no prefix) + 26 blocks × 500 (A–Z). */
    public const MAX_SEQ = self::BLOCK_SIZE + (26 * self::BLOCK_SIZE);

    /**
     * Format sequence into registration number.
     *
     * seq 1–500:     01/M/YYYY … 500/M/YYYY
     * seq 501–1000:  A01/M/YYYY … A500/M/YYYY
     * seq 1001–1500: B01/M/YYYY … B500/M/YYYY
     */
    public static function format(int $seq, int $month, int $year): string
    {
        if ($seq < 1) {
            throw new \InvalidArgumentException('Sequence must be at least 1.');
        }

        if ($seq > self::MAX_SEQ) {
            throw new \InvalidArgumentException(
                sprintf('Sequence %d exceeds maximum supported registration number (%d per month).', $seq, self::MAX_SEQ)
            );
        }

        $block = intdiv($seq - 1, self::BLOCK_SIZE);
        $within = (($seq - 1) % self::BLOCK_SIZE) + 1;
        $romanMonth = RomanNumerals::toRoman($month);
        $seqPart = sprintf('%02d', $within);

        if ($block === 0) {
            return sprintf('%s/%s/%04d', $seqPart, $romanMonth, $year);
        }

        $prefix = chr(ord('A') + $block - 1);

        return sprintf('%s%s/%s/%04d', $prefix, $seqPart, $romanMonth, $year);
    }
}
