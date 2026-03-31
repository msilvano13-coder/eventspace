-- =============================================================================
-- Atomic Replace Migration
-- Wraps multi-step replace operations in transactions to prevent partial writes.
-- =============================================================================

-- ── Atomic vendor replace (upsert + delete removed + replace payments) ──
CREATE OR REPLACE FUNCTION public.atomic_replace_vendors(
  p_event_id uuid,
  p_user_id uuid,
  p_vendors jsonb,
  p_payments jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_ids uuid[];
BEGIN
  -- Verify event ownership
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = p_event_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;

  IF jsonb_array_length(p_vendors) > 0 THEN
    -- 1. Upsert vendors
    INSERT INTO vendors (id, event_id, user_id, name, category, contact, phone, email, notes, meal_choice, contract_total)
    SELECT
      (elem->>'id')::uuid,
      p_event_id,
      p_user_id,
      COALESCE(elem->>'name', ''),
      COALESCE(elem->>'category', 'other'),
      COALESCE(elem->>'contact', ''),
      COALESCE(elem->>'phone', ''),
      COALESCE(elem->>'email', ''),
      COALESCE(elem->>'notes', ''),
      COALESCE(elem->>'meal_choice', ''),
      COALESCE((elem->>'contract_total')::numeric, 0)
    FROM jsonb_array_elements(p_vendors) AS elem
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      contact = EXCLUDED.contact,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      notes = EXCLUDED.notes,
      meal_choice = EXCLUDED.meal_choice,
      contract_total = EXCLUDED.contract_total;

    -- 2. Collect vendor IDs
    SELECT array_agg((elem->>'id')::uuid)
    INTO v_vendor_ids
    FROM jsonb_array_elements(p_vendors) AS elem;

    -- 3. Delete removed vendors (payments cascade)
    DELETE FROM vendors WHERE event_id = p_event_id AND id != ALL(v_vendor_ids);

    -- 4. Delete all payments for current vendors
    DELETE FROM vendor_payments WHERE vendor_id = ANY(v_vendor_ids);

    -- 5. Re-insert payments
    IF jsonb_array_length(p_payments) > 0 THEN
      INSERT INTO vendor_payments (id, vendor_id, description, amount, due_date, paid, paid_date)
      SELECT
        (elem->>'id')::uuid,
        (elem->>'vendor_id')::uuid,
        COALESCE(elem->>'description', ''),
        COALESCE((elem->>'amount')::numeric, 0),
        COALESCE(elem->>'due_date', ''),
        COALESCE((elem->>'paid')::boolean, false),
        NULLIF(elem->>'paid_date', '')
      FROM jsonb_array_elements(p_payments) AS elem;
    END IF;
  ELSE
    -- Delete all vendors (payments cascade via FK)
    DELETE FROM vendors WHERE event_id = p_event_id;
  END IF;
END;
$$;

-- ── Atomic invoice replace (upsert + delete removed + replace line items) ──
CREATE OR REPLACE FUNCTION public.atomic_replace_invoices(
  p_event_id uuid,
  p_user_id uuid,
  p_invoices jsonb,
  p_line_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_ids uuid[];
BEGIN
  -- Verify event ownership
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = p_event_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;

  IF jsonb_array_length(p_invoices) > 0 THEN
    -- 1. Upsert invoices
    INSERT INTO invoices (id, event_id, user_id, number, status, notes, due_date, created_at)
    SELECT
      (elem->>'id')::uuid,
      p_event_id,
      p_user_id,
      COALESCE(elem->>'number', ''),
      COALESCE(elem->>'status', 'draft'),
      COALESCE(elem->>'notes', ''),
      NULLIF(elem->>'due_date', ''),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(p_invoices) AS elem
    ON CONFLICT (id) DO UPDATE SET
      number = EXCLUDED.number,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      due_date = EXCLUDED.due_date;

    -- 2. Collect invoice IDs
    SELECT array_agg((elem->>'id')::uuid)
    INTO v_invoice_ids
    FROM jsonb_array_elements(p_invoices) AS elem;

    -- 3. Delete removed invoices (line items cascade)
    DELETE FROM invoices WHERE event_id = p_event_id AND id != ALL(v_invoice_ids);

    -- 4. Delete all line items for current invoices
    DELETE FROM invoice_line_items WHERE invoice_id = ANY(v_invoice_ids);

    -- 5. Re-insert line items
    IF jsonb_array_length(p_line_items) > 0 THEN
      INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price)
      SELECT
        (elem->>'id')::uuid,
        (elem->>'invoice_id')::uuid,
        COALESCE(elem->>'description', ''),
        COALESCE((elem->>'quantity')::int, 1),
        COALESCE((elem->>'unit_price')::numeric, 0)
      FROM jsonb_array_elements(p_line_items) AS elem;
    END IF;
  ELSE
    -- Delete all invoices (line items cascade via FK)
    DELETE FROM invoices WHERE event_id = p_event_id;
  END IF;
END;
$$;
