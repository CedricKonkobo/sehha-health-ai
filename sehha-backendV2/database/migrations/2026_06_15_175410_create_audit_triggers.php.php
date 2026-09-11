<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Fonction trigger
        DB::unprepared('
            CREATE OR REPLACE FUNCTION audit_trigger_func()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (TG_OP = \'DELETE\') THEN
                    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, timestamp)
                    VALUES (
                        NULL,
                        \'delete\',
                        TG_TABLE_NAME,
                        OLD.id,
                        to_jsonb(OLD),
                        NULL,
                        inet_client_addr()::text,
                        NOW()
                    );
                    RETURN OLD;
                ELSIF (TG_OP = \'UPDATE\') THEN
                    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, timestamp)
                    VALUES (
                        NULL,
                        \'update\',
                        TG_TABLE_NAME,
                        NEW.id,
                        to_jsonb(OLD),
                        to_jsonb(NEW),
                        inet_client_addr()::text,
                        NOW()
                    );
                    RETURN NEW;
                ELSIF (TG_OP = \'INSERT\') THEN
                    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, timestamp)
                    VALUES (
                        NULL,
                        \'create\',
                        TG_TABLE_NAME,
                        NEW.id,
                        NULL,
                        to_jsonb(NEW),
                        inet_client_addr()::text,
                        NOW()
                    );
                    RETURN NEW;
                END IF;
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
        ');

        // Appliquer aux tables sensibles
        $tables = [
            'patient_records',
            'consultations',
            'medical_documents',
            'triage_events',
            'appointments',
            'allergies',
            'medical_history',
            'vital_signs',
            'inventory',
        ];

        foreach ($tables as $table) {
            DB::unprepared("
                DROP TRIGGER IF EXISTS audit_trigger_{$table} ON {$table};
                CREATE TRIGGER audit_trigger_{$table}
                AFTER INSERT OR UPDATE OR DELETE ON {$table}
                FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
            ");
        }
    }

    public function down(): void
    {
        $tables = [
            'patient_records',
            'consultations',
            'medical_documents',
            'triage_events',
            'appointments',
            'allergies',
            'medical_history',
            'vital_signs',
            'inventory',
        ];

        foreach ($tables as $table) {
            DB::unprepared("DROP TRIGGER IF EXISTS audit_trigger_{$table} ON {$table};");
        }

        DB::unprepared('DROP FUNCTION IF EXISTS audit_trigger_func();');
    }
};