<?php

namespace App\Helpers;

class DirectionHelper
{
    /**
     * Convert old direction format to new format
     */
    public static function convertToNewFormat(string $oldDirection): string
    {
        $conversions = [
            'ID->ZH' => 'Indo-Mandarin',
            'ZH->ID' => 'Mandarin-Indo',
            'ID->TW' => 'Indo-Taiwan',
            'TW->ID' => 'Taiwan-Indo',
        ];

        return $conversions[$oldDirection] ?? $oldDirection;
    }

    /**
     * Convert new direction format to old format for database storage
     */
    public static function convertToOldFormat(string $newDirection): string
    {
        $conversions = [
            'Indo-Mandarin' => 'ID->ZH',
            'Mandarin-Indo' => 'ZH->ID',
            'Indo-Taiwan' => 'ID->TW',
            'Taiwan-Indo' => 'TW->ID',
        ];

        return $conversions[$newDirection] ?? $newDirection;
    }

    /**
     * Get all available directions in new format
     */
    public static function getAvailableDirections(): array
    {
        return [
            'Indo-Mandarin',
            'Mandarin-Indo',
            'Indo-Taiwan',
            'Taiwan-Indo',
        ];
    }

    /**
     * Get all available directions in old format (for database)
     */
    public static function getAvailableDirectionsOld(): array
    {
        return [
            'ID->ZH',
            'ZH->ID',
            'ID->TW',
            'TW->ID',
        ];
    }

    /**
     * Expand a selected export direction slug into every database value that
     * should match, covering both the new and legacy storage formats.
     *
     * The documents table historically mixes formats (a migration rewrote old
     * rows to the new format, while create/update still persist the old format),
     * so filtering must match either representation to avoid dropping rows.
     *
     * @return array<int, string>
     */
    public static function expandSelectionToDbValues(string $selectionSlug): array
    {
        $newFormatVariants = [
            'indo-mandarin' => ['Indo-Mandarin', 'Indo-Taiwan'],
            'mandarin-indo' => ['Mandarin-Indo', 'Taiwan-Indo'],
        ];

        $variants = $newFormatVariants[$selectionSlug] ?? [];

        $oldFormatVariants = array_map(
            fn (string $direction): string => self::convertToOldFormat($direction),
            $variants
        );

        return array_values(array_unique(array_merge($variants, $oldFormatVariants)));
    }
}
