"""Attempt to create tables

Revision ID: b8047292e2fa
Revises: 030b2a67e90f
Create Date: 2021-01-26 16:03:54.120544

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b8047292e2fa'
down_revision = '030b2a67e90f'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('rehearsal_group',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('group_name', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('group_name')
    )
    op.create_table('user',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_name', sa.String(), nullable=False),
    sa.Column('google_email', sa.String(), nullable=False),
    sa.Column('google_auth_id', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('google_auth_id'),
    sa.UniqueConstraint('google_email')
    )
    op.create_table('group_membership',
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('group_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['group_id'], ['rehearsal_group.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], )
    )
    op.create_table('project',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('project_name', sa.String(), nullable=False),
    sa.Column('group_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['group_id'], ['rehearsal_group.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('project_name')
    )
    op.create_table('track',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('track_name', sa.String(), nullable=True),
    sa.Column('project_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['project.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('take',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('track_id', sa.Integer(), nullable=True),
    sa.Column('take', sa.Integer(), nullable=False),
    sa.Column('s3_info', sa.String(), nullable=False),
    sa.ForeignKeyConstraint(['track_id'], ['track.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('s3_info')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('take')
    op.drop_table('track')
    op.drop_table('project')
    op.drop_table('group_membership')
    op.drop_table('user')
    op.drop_table('rehearsal_group')
    # ### end Alembic commands ###
