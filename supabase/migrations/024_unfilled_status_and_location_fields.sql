-- Migration 024: Add 'unfilled' job status and geolocation fields to work_records

-- 1. Add 'unfilled' to job_status enum
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'unfilled';

-- 2. Add geolocation columns to work_records for check-in/check-out tracking
ALTER TABLE work_records
  ADD COLUMN IF NOT EXISTS check_in_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_longitude DOUBLE PRECISION;
