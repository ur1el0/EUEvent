<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Holds a registration until its email is verified (ADR 016). No users row exists before that.
 * The password is stored hashed and the one-time code only as a keyed hash.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pending_registrations', function (Blueprint $table): void {
            $table->id();
            $table->string('email')->unique();
            $table->string('student_number', 32)->index();
            $table->string('name');
            $table->string('password');
            $table->string('code_hash', 64);
            $table->timestampTz('expires_at')->index();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestampTz('last_sent_at');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_registrations');
    }
};
