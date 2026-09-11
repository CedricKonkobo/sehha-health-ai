<?php

namespace Database\Seeders;

use App\Models\Inventory;
use App\Models\User;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::where('role', 'admin')->first()?->id;

        Inventory::factory()->count(30)->create([
            'last_updated_by' => $adminId,
        ]);
    }
}