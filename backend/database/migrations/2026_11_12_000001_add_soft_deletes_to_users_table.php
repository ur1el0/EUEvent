<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Accounts are soft deleted (ADR 015). A deleted user keeps its real name, email and student number
 * so scan logs, tickets, assignments and the activity log still read correctly, and the unique
 * indexes only cover rows that are not deleted, so the same email or student number can be registered again.
 * Partial unique indexes are supported by both PostgreSQL and SQLite.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->softDeletesTz();
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['email']);
            $table->dropUnique(['student_number']);
        });

        DB::statement('CREATE UNIQUE INDEX users_email_active_unique ON users (email) WHERE deleted_at IS NULL');
        DB::statement('CREATE UNIQUE INDEX users_student_number_active_unique ON users (student_number) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX users_email_active_unique');
        DB::statement('DROP INDEX users_student_number_active_unique');

        // Restoring full uniqueness fails if a deleted and a live account now share an email or student number.
        Schema::table('users', function (Blueprint $table): void {
            $table->unique('email');
            $table->unique('student_number');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropSoftDeletes();
        });
    }
};
