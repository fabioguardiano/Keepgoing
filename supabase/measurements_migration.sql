-- Create measurements table
CREATE TABLE measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    address TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Concluída', 'Cancelada')),
    measurer_name TEXT,
    os_id UUID,
    os_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their company's measurements"
ON measurements FOR SELECT
USING (company_id = (auth.jwt()->'user_metadata'->>'company_id')::uuid);

CREATE POLICY "Users can insert their company's measurements"
ON measurements FOR INSERT
WITH CHECK (company_id = (auth.jwt()->'user_metadata'->>'company_id')::uuid);

CREATE POLICY "Users can update their company's measurements"
ON measurements FOR UPDATE
USING (company_id = (auth.jwt()->'user_metadata'->>'company_id')::uuid);

CREATE POLICY "Users can delete their company's measurements"
ON measurements FOR DELETE
USING (company_id = (auth.jwt()->'user_metadata'->>'company_id')::uuid);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_measurements_updated_at
    BEFORE UPDATE ON measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
