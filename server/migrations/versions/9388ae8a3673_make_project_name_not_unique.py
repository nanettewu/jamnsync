"""make project name not unique

Revision ID: 9388ae8a3673
Revises: 63cb3b652a1e
Create Date: 2021-02-10 18:33:13.863634

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9388ae8a3673'
down_revision = '63cb3b652a1e'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint('project_project_name_key', 'project', type_='unique')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_unique_constraint('project_project_name_key', 'project', ['project_name'])
    # ### end Alembic commands ###