var gnuplot = require('gnuplot'),
    graph = gnuplot();

graph.set('term pngcairo')
    .set('output "out2.png"')
    .set(`loadpath "${__dirname}"`)
    .set('load "xyborder.cfg"')
    .set('load "grid.cfg"')
    .set('title "Some Math Functions"')
    .set('xrange [-10:10]')
    .set('yrange [-2:2]')
    .set('zeroaxis')

    // add grid
    .set('style line 102 lc rgb "#d6d7d9" lt 0 lw 1')
    .set('grid back ls 102')
    // add colors
    .set('style line 1 lt 1 lc rgb "#1B9E77"')  // dark teal
    .set('style line 2 lt 1 lc rgb "#D95F02"')  // dark orange
    .set('style line 3 lt 1 lc rgb "#7570B3"')  // dark lilac
    .set('style line 4 lt 1 lc rgb "#E7298A"')  // dark magenta
    .set('style line 5 lt 1 lc rgb "#66A61E"')  // dark lime green
    .set('style line 6 lt 1 lc rgb "#E6AB02"')  // dark banana
    .set('style line 7 lt 1 lc rgb "#A6761D"')  // dark tan
    .set('style line 8 lt 1 lc rgb "#666666"')  // dark gray

// palette
    .set('palette maxcolors 8')
    .set('palette defined ( 0 "#1B9E77", 1 "#D95F02", 2 "#7570B3", 3 "#E7298A", 4 "#66A61E", 5 "#E6AB02", 6 "#A6761D",7 "#666666" )')

    //.plot('(x/4)**2 lw 2, sin(x) lw 2, 1/x lw 2')
    // TODO: 
    .set('datafile separator ","')
    .plot('"-" using 1:2 with lines, "" using 1:3 with lines\n0,1,2\n1,2,3\n2,3,4\ne0,1,2\n2,3,4\ne')
    .end();

// set style line 102 lc rgb '#d6d7d9' lt 0 lw 1
// et grid back ls 102
