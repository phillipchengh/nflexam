nflexam
=======

nflexam
nflexam examines NFL team statistics! It uses Principal Component Analysis (PCA) to determine scores based on each team's regular season stats. You can specify which stat categories using New Data.

Total Scores: PCA calculated score to quantify each team's performance with one number. This is based on my admittedly simple ranking of adding or subtracting each PC's projection. An opp headed stat signifies the quantity that the team allowed (I.E. Opp Passing Yds = Passing Yds team allowed from all opponents).
Regression: Comparison with the NFL draft order that year to illustrate how well the stat categories reflect actual performance. An accurate representation has an R² close to 1.
Explained: How much each Principal Component (PC) explains the data variance in percent. Only the components that explain at least 1% variance are used (k number of components).
Raw: You can also query stats using /nflexam/pca?year=YEAR&cat=CATEGORY1&cat=CATEGORY2... but don't expect me to handle heavy requests! Note that CATEGORY is lower cased and underscored.
The PCA calculations are computed via numpy python and the data is extracted from nfldb. Let me know about errors!
