"""Initial migration.

Revision ID: 030b2a67e90f
Revises: 
Create Date: 2021-01-26 15:22:20.411257

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '030b2a67e90f'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('track_info')
    op.drop_table('group_membership')
    op.drop_table('project_track')
    op.drop_table('group_project')
    op.drop_table('rehearsal_group')
    op.drop_constraint('user_google_id_key', 'user', type_='unique')
    op.drop_column('user', 'google_auth_id')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('user', sa.Column('google_auth_id', sa.TEXT(), autoincrement=False, nullable=False))
    op.create_unique_constraint('user_google_id_key', 'user', ['google_auth_id'])
    op.create_table('project_track',
    sa.Column('track_id', sa.INTEGER(), server_default=sa.text("nextval('project_track_track_id_seq'::regclass)"), autoincrement=True, nullable=False),
    sa.Column('group_project_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('track_name', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('latest_take', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['group_project_id'], ['group_project.id'], name='project_tracks_project_id_fkey'),
    sa.PrimaryKeyConstraint('track_id', name='project_track_pkey'),
    postgresql_ignore_search_path=False
    )
    op.create_table('group_project',
    sa.Column('id', sa.INTEGER(), server_default=sa.text("nextval('group_project_id_seq'::regclass)"), autoincrement=True, nullable=False),
    sa.Column('group_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('project_name', sa.TEXT(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['group_id'], ['rehearsal_group.id'], name='group_projects_group_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='group_project_pkey'),
    postgresql_ignore_search_path=False
    )
    op.create_table('rehearsal_group',
    sa.Column('id', sa.INTEGER(), server_default=sa.text("nextval('rehearsal_group_id_seq'::regclass)"), autoincrement=True, nullable=False),
    sa.Column('group_name', sa.TEXT(), autoincrement=False, nullable=False),
    sa.PrimaryKeyConstraint('id', name='rehearsal_group_pkey'),
    sa.UniqueConstraint('group_name', name='rehearsal_group_name_key'),
    postgresql_ignore_search_path=False
    )
    op.create_table('group_membership',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('group_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['group_id'], ['rehearsal_group.id'], name='group_membership_group_id_fkey'),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name='group_membership_user_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='group_membership_pkey')
    )
    op.create_table('track_info',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('take', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('s3_info', sa.TEXT(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['id'], ['project_track.track_id'], name='track_info_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='track_info_pkey'),
    sa.UniqueConstraint('s3_info', name='track_info_s3_info_key')
    )
    # ### end Alembic commands ###
