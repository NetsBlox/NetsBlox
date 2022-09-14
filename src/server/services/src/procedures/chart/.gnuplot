# enable macros
set macros
# search for functions or data files in these directories
set loadpath '/usr/local/lib/gnuplot'
# add default line colors
set style line 1 lc rgb '#0060ad' lt 1 lw 2 pt 5   # blue
set style line 2 lc rgb '#dd181f' lt 1 lw 2 pt 7   # red
# add macros to select the desired line style
BLUE = "1"
RED = "2"
# add macros to select a desired terminal
WXT = "set terminal wxt size 350,262 enhanced font 'Verdana,10' \
   persist"
PNG = "set terminal pngcairo size 350,262 enhanced font 'Verdana,10'"
SVG = "set terminal svg size 350,262 fname \
   'Verdana, Helvetica, Arial, sans-serif' fsize = 10"
