"""Stable public IDs, updated-at triggers, soft delete, and route provenance.

Revision ID: 0009
Revises: 0008
"""

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None

PUBLIC_ID_TABLES = ("Route", "Node", "DeveloperAccount", "RouteContribution", "CommunityPost")
UPDATED_AT_TABLES = (*PUBLIC_ID_TABLES, "ApiKey")
SOFT_DELETE_TABLES = ("Route", "DeveloperAccount", "RouteContribution", "CommunityPost")


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION tsela_set_updated_at() RETURNS trigger AS $$
        BEGIN
          NEW."updatedAt" = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    for table in PUBLIC_ID_TABLES:
        op.execute(
            f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS '
            '"publicId" UUID NOT NULL DEFAULT gen_random_uuid()'
        )
        op.execute(
            f'CREATE UNIQUE INDEX IF NOT EXISTS ix_{table.lower()}_public_id '
            f'ON "{table}" ("publicId")'
        )
    for table in UPDATED_AT_TABLES:
        op.execute(
            f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS '
            '"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()'
        )
        op.execute(f'DROP TRIGGER IF EXISTS trg_{table.lower()}_updated_at ON "{table}"')
        op.execute(
            f'CREATE TRIGGER trg_{table.lower()}_updated_at BEFORE UPDATE ON "{table}" '
            "FOR EACH ROW EXECUTE FUNCTION tsela_set_updated_at()"
        )
    for table in SOFT_DELETE_TABLES:
        op.execute(f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ')
        op.execute(
            f'CREATE INDEX IF NOT EXISTS ix_{table.lower()}_live ON "{table}" (id) '
            'WHERE "deletedAt" IS NULL'
        )

    op.execute(
        "ALTER TABLE \"Route\" ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL "
        "DEFAULT 'community'"
    )
    op.execute(
        "ALTER TABLE \"Route\" ADD COLUMN IF NOT EXISTS \"verificationStatus\" VARCHAR(20) "
        "NOT NULL DEFAULT 'unverified'"
    )
    op.execute('ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMPTZ')
    op.execute('ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "verifiedById" INTEGER')
    op.execute(
        'ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "hiddenReason" VARCHAR(200)'
    )


def downgrade() -> None:
    op.execute('ALTER TABLE "CommunityPost" DROP COLUMN IF EXISTS "hiddenReason"')
    for column in ("verifiedById", "verifiedAt", "verificationStatus", "source"):
        op.execute(f'ALTER TABLE "Route" DROP COLUMN IF EXISTS "{column}"')
    for table in SOFT_DELETE_TABLES:
        op.execute(f"DROP INDEX IF EXISTS ix_{table.lower()}_live")
        op.execute(f'ALTER TABLE "{table}" DROP COLUMN IF EXISTS "deletedAt"')
    for table in UPDATED_AT_TABLES:
        op.execute(f'DROP TRIGGER IF EXISTS trg_{table.lower()}_updated_at ON "{table}"')
        op.execute(f'ALTER TABLE "{table}" DROP COLUMN IF EXISTS "updatedAt"')
    op.execute("DROP FUNCTION IF EXISTS tsela_set_updated_at()")
    for table in PUBLIC_ID_TABLES:
        op.execute(f"DROP INDEX IF EXISTS ix_{table.lower()}_public_id")
        op.execute(f'ALTER TABLE "{table}" DROP COLUMN IF EXISTS "publicId"')
