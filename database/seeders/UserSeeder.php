<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Super Admin
        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('admin123'),
            'role' => 'ADMIN',
            'email_verified_at' => now(),
        ]);

        // Create Admin
        User::create([
            'name' => 'Administrator',
            'email' => 'administrator@example.com',
            'password' => Hash::make('admin123'),
            'role' => 'ADMIN',
            'email_verified_at' => now(),
        ]);

        // Create Client Users
        User::create([
            'name' => 'Client One',
            'email' => 'client1@example.com',
            'password' => Hash::make('client123'),
            'role' => 'CLIENT',
            'email_verified_at' => now(),
        ]);

        User::create([
            'name' => 'Client Two',
            'email' => 'client2@example.com',
            'password' => Hash::make('client123'),
            'role' => 'CLIENT',
            'email_verified_at' => now(),
        ]);

        User::create([
            'name' => 'Client Three',
            'email' => 'client3@example.com',
            'password' => Hash::make('client123'),
            'role' => 'CLIENT',
            'email_verified_at' => now(),
        ]);

        // Create Demo Users
        User::create([
            'name' => 'Demo Admin',
            'email' => 'demo.admin@example.com',
            'password' => Hash::make('demo123'),
            'role' => 'ADMIN',
            'email_verified_at' => now(),
        ]);

        User::create([
            'name' => 'Demo Client',
            'email' => 'demo.client@example.com',
            'password' => Hash::make('demo123'),
            'role' => 'CLIENT',
            'email_verified_at' => now(),
        ]);

        $this->command->info('Users created successfully!');
        $this->command->info('');
        $this->command->info('=== ADMIN ACCOUNTS ===');
        $this->command->info('Super Admin: admin@example.com / admin123');
        $this->command->info('Administrator: administrator@example.com / admin123');
        $this->command->info('Demo Admin: demo.admin@example.com / demo123');
        $this->command->info('');
        $this->command->info('=== CLIENT ACCOUNTS ===');
        $this->command->info('Client One: client1@example.com / client123');
        $this->command->info('Client Two: client2@example.com / client123');
        $this->command->info('Client Three: client3@example.com / client123');
        $this->command->info('Demo Client: demo.client@example.com / demo123');
    }
}
