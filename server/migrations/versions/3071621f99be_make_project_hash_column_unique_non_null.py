"""make project hash column unique/non-null

Revision ID: 3071621f99be
Revises: 0cd41610d1d0
Create Date: 2021-02-04 18:00:23.950099

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3071621f99be'
down_revision = '0cd41610d1d0'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('project', 'project_hash',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.create_unique_constraint(None, 'project', ['project_hash'])
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'project', type_='unique')
    op.alter_column('project', 'project_hash',
               existing_type=sa.VARCHAR(),
               nullable=True)
    # ### end Alembic commands ###