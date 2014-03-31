import os
import sys
import psycopg2
import numpy as np
from scipy import linalg as sp
from scipy import stats as st
import json

def pg_select(query_text):

	# Set up connection and query text
	conn_info = "dbname=nflexam user=" + os.environ.get('NFLEXAM_USER') + " password=" + os.environ.get('NFLEXAM_PASS')	

	# Connect and query.
	conn = psycopg2.connect(conn_info)
	cursor = conn.cursor()
	cursor.execute(query_text)
	rows = cursor.fetchall()

	# Close.
	cursor.close()
	conn.close()

	return rows

def select_stats(year, cat):

	# Setup column names = obtained cat and allowed cat.
	opp_cat = ['opp_' + c for c in cat]
	all_cat = cat + opp_cat
	query_text = """
	SELECT {} FROM season_stat WHERE year = {} ORDER BY team;
	""".format(', '.join(all_cat), year)

	return pg_select(query_text), all_cat

def select_teams(year):

	# Query the teams for that year.
	query_text = """
	SELECT team FROM season_stat WHERE year = {} ORDER BY team;
	""".format(year)

	return pg_select(query_text)

def select_draft(year):

	# Query the draft order for that year.
	query_text_team = """
	SELECT team FROM draft_order WHERE year = {} ORDER BY pick;
	""".format(year)

	query_text_pick = """
	SELECT pick FROM draft_order WHERE year = {} ORDER BY pick;
	""".format(year)

	return pg_select(query_text_team), pg_select(query_text_pick)

def rank_teams(scores, pca, all_cat):

	# Get sizes.
	stats_teams = np.shape(scores)[0]
	(pca_rows, pca_cols) = np.shape(pca) 

	# Contains max cat of each column in order.
	pc_cats = ['']*pca_cols

	# Get each maximum of each pca column.
	pca_col = np.shape(pca)[1]
	max_idx = [0]*pca_col
	for p in range(0, pca_col):
		col = pca[:,p]
		max_idx[p] = np.where(col == np.max(col))[0][0]

	total_scores = np.zeros((stats_teams, 1))
	for i in range(0, stats_teams):
		for j in range(0, pca_cols):
			# If the maximum index indicates the opposing team's score, then subtract the value of it.
			# Note that scores, the reference, will be modified.
			if (max_idx[j] + 1) > (pca_rows / 2):
				scores[i][j] = -scores[i][j]
			total_scores[i] += scores[i][j]
			pc_cats[j] = all_cat[max_idx[j]]

	# Insert team_num (representing alpha order) and total_scores then sort.
	team_num = np.array([range(0, 32)]).T
	scores = np.append(total_scores, scores, axis=1)
	scores = np.append(team_num, scores, axis=1)
	scores = scores[scores[:, 1].argsort()]

	# Uncomment to offset values so smallest score is 0 (also removes negative values).
	# scores[:, 1] = scores[:, 1] - scores[:, 1][0]

	return scores, pc_cats

def pca_teams(data):

	# Convert stats to numpy array.
	stats = np.array(data)

	# PCA.
	mn = np.mean(stats, axis=0)
	stats -= mn
	C = np.cov(stats.T)
	evals, pca = sp.eig(C)
	idx = np.argsort(evals)[::-1]
	pca = pca[:,idx]
	evals = evals[idx]

	# Matlab: Enforce a sign convention on the coefficients.
	# The largest element in each column will have a positive sign.
	pca_col = np.shape(pca)[1]
	for p in range(0, pca_col):
		col = pca[:,p]
		abs_col = np.abs(col)
		max_idx = np.where(abs_col == np.max(abs_col))[0][0]
		if (col[max_idx] < 0):
			pca[:,p] = -col

	# Project each teams' scores.
	scores = np.dot(pca.T, stats.T).T

	# Calculate percentage variance.
	latent = evals.real
	explained = latent / sum(latent) * 100

	# Limit to only first k PCs (percentage variance > 1).
	k = np.size(np.where(explained > 1)[0])
	scores = scores[:,:k]
	pca = pca[:,:k]

	return scores, pca, explained, k

def lin_reg(year, my_order):

	draft_order, picks = select_draft(year)
	x = [0]*len(draft_order)
	y = [0]*len(draft_order)
	do = ['']*len(draft_order)
	for (i, t) in enumerate(draft_order):
		x[i] = i
		idx = my_order.index(t[0])
		y[idx] = i
		do[i] = t[0]
	slope, intercept, r_value, p_value, std_err = st.linregress(x, y)
	return y, r_value**2, do

def scores_to_json(year, scores, explained, k, pc_cats):

	# Map team numbers to team_ids
	team_map = select_teams(year)
	team_ids = [team_map[int(t)][0] for t in scores.real.T[0].tolist()]

	# Convert back to list from numpy array.
	scores = scores.real.tolist()

	# Linear regression
	y, r_sq, do = lin_reg(year, team_ids)

	# Explained
	explained = explained.tolist()

	# Convert to JSON.
	ts = []
	lr = []
	for (i, t) in enumerate(team_ids):
		score_dict = {}
		score_dict['team_id'] = t
		score_dict['total_score'] = scores[i][1]
		score_dict['scores'] = scores[i][2:]
		ts.append(score_dict)
		lr_dict = {}
		lr_dict['y'] = y[i]
		lr_dict['team_id'] = team_ids[i]
		lr_dict['draft_team'] = do[i]
		lr.append(lr_dict)

	js = {}
	js['scores'] = ts
	js['linreg'] = lr
	js['r_squared'] = r_sq
	js['k'] = k;
	js['explained'] = explained
	js['pc_cats'] = pc_cats

	return json.dumps(js)

def main(args):
	# Check arguments.
	if len(args) < 2:
		sys.stderr.write('Check your arguments.\n')
		return 1

	# Get the stats.
	stats, all_cat = select_stats(args[0], args[1:])

	# PCA.
	scores, pca, explained, k = pca_teams(stats)

	# Rank teams.
	ranked_scores, pc_cats = rank_teams(scores, pca, all_cat)

	# Convert data to JSON. It also adds linear regression.
	out = scores_to_json(args[0], ranked_scores, explained, k, pc_cats)
	print out

	return 0

if __name__ == '__main__':
	sys.exit(main(sys.argv[1:]) or 0)