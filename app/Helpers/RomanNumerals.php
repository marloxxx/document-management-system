<?php

namespace App\Helpers;

class RomanNumerals
{
    /**
     * Convert integer to Roman numeral
     */
    public static function toRoman(int $number): string
    {
        if ($number <= 0 || $number > 12) {
            return (string) $number; // Return original number if out of range
        }

        $romanNumerals = [
            1 => 'I',
            2 => 'II',
            3 => 'III',
            4 => 'IV',
            5 => 'V',
            6 => 'VI',
            7 => 'VII',
            8 => 'VIII',
            9 => 'IX',
            10 => 'X',
            11 => 'XI',
            12 => 'XII'
        ];

        return $romanNumerals[$number] ?? (string) $number;
    }

    /**
     * Convert Roman numeral to integer
     */
    public static function fromRoman(string $roman): int
    {
        $romanToInt = [
            'I' => 1,
            'II' => 2,
            'III' => 3,
            'IV' => 4,
            'V' => 5,
            'VI' => 6,
            'VII' => 7,
            'VIII' => 8,
            'IX' => 9,
            'X' => 10,
            'XI' => 11,
            'XII' => 12
        ];

        return $romanToInt[$roman] ?? 0;
    }
}
