const nasaCenters = [["39°44.2'N", "171°35.4'W"],
["41°29.2'N", "162°51.0'W"],
["42°39.8'N", "155°57.2'W"],
["43°20.2'N", "151°18.6'W"],
["43°48.2'N", "147°34.2'W"],
["44°08.8'N", "144°21.3'W"],
["44°24.1'N", "141°29.7'W"],
["44°35.6'N", "138°53.8'W"],
["44°44.1'N", "136°30.2'W"],
["44°49.9'N", "134°16.5'W"],
["44°53.7'N", "132°11.0'W"],
["44°55.6'N", "130°12.5'W"],
["44°55.8'N", "128°20.0'W"],
["44°54.7'N", "126°32.9'W"],
["44°52.2'N", "124°50.5'W"],
["44°48.6'N", "123°12.3'W"],
["44°44.0'N", "121°38.0'W"],
["44°38.3'N", "120°07.2'W"],
["44°31.8'N", "118°39.5'W"],
["44°24.4'N", "117°14.8'W"],
["44°16.3'N", "115°52.8'W"],
["44°07.4'N", "114°33.3'W"],
["43°57.9'N", "113°16.2'W"],
["43°47.7'N", "112°01.3'W"],
["43°37.0'N", "110°48.5'W"],
["43°25.6'N", "109°37.6'W"],
["43°13.7'N", "108°28.5'W"],
["43°01.3'N", "107°21.1'W"],
["42°48.5'N", "106°15.4'W"],
["42°35.1'N", "105°11.2'W"],
["42°21.3'N", "104°08.4'W"],
["42°07.1'N", "103°07.0'W"],
["41°52.5'N", "102°06.9'W"],
["41°37.5'N", "101°08.1'W"],
["41°22.1'N", "100°10.4'W"],
["41°06.4'N", "099°13.8'W"],
["40°50.3'N", "098°18.3'W"],
["40°33.9'N", "097°23.7'W"],
["40°17.1'N", "096°30.1'W"],
["40°00.0'N", "095°37.4'W"],
["39°42.6'N", "094°45.6'W"],
["39°24.9'N", "093°54.5'W"],
["39°07.0'N", "093°04.2'W"],
["38°48.7'N", "092°14.6'W"],
["38°30.1'N", "091°25.6'W"],
["38°11.3'N", "090°37.3'W"],
["37°52.2'N", "089°49.6'W"],
["37°32.8'N", "089°02.4'W"],
["37°13.2'N", "088°15.7'W"],
["36°53.3'N", "087°29.5'W"],
["36°33.1'N", "086°43.7'W"],
["36°12.7'N", "085°58.3'W"],
["35°52.1'N", "085°13.3'W"],
["35°31.2'N", "084°28.6'W"],
["35°10.0'N", "083°44.1'W"],
["34°48.6'N", "082°59.9'W"],
["34°26.9'N", "082°15.9'W"],
["34°05.0'N", "081°32.1'W"],
["33°42.9'N", "080°48.4'W"],
["33°20.5'N", "080°04.7'W"],
["32°57.8'N", "079°21.2'W"],
["32°34.9'N", "078°37.6'W"],
["32°11.7'N", "077°54.0'W"]];


const nasaCenters2 = [[39.73666667, -171.59],
[41.48666667, -162.85],
[42.66333333, -155.95333333],
[43.33666667, -151.31],
[43.80333333, -147.57],
[44.14666667, -144.355],
[44.40166667, -141.495],
[44.59333333, -138.89666667],
[44.735, -136.50333333],
[44.83166667, -134.275],
[44.895, -132.18333333],
[44.92666667, -130.20833333],
[44.93, -128.33333333],
[44.91166667, -126.54833333],
[44.87, -124.84166667],
[44.81, -123.205],
[44.73333333, -121.63333333],
[44.63833333, -120.12],
[44.53, -118.65833333],
[44.40666667, -117.24666667],
[44.27166667, -115.88],
[44.12333333, -114.555],
[43.965, -113.27],
[43.795, -112.02166667],
[43.61666667, -110.80833333],
[43.42666667, -109.62666667],
[43.22833333, -108.475],
[43.02166667, -107.35166667],
[42.80833333, -106.25666667],
[42.585, -105.18666667],
[42.355, -104.14],
[42.11833333, -103.11666667],
[41.875, -102.115],
[41.625, -101.135],
[41.36833333, -100.17333333],
[41.10666667, -99.23],
[40.83833333, -98.305],
[40.565, -97.395],
[40.285, -96.50166667],
[40, -95.62333333],
[39.71, -94.76],
[39.415, -93.90833333],
[39.11666667, -93.07],
[38.81166667, -92.24333333],
[38.50166667, -91.42666667],
[38.18833333, -90.62166667],
[37.87, -89.82666667],
[37.54666667, -89.04],
[37.22, -88.26166667],
[36.88833333, -87.49166667],
[36.55166667, -86.72833333],
[36.21166667, -85.97166667],
[35.86833333, -85.22166667],
[35.52, -84.47666667],
[35.16666667, -83.735],
[34.81, -82.99833333],
[34.44833333, -82.265],
[34.08333333, -81.535],
[33.715, -80.80666667],
[33.34166667, -80.07833333],
[32.96333333, -79.35333333],
[32.58166667, -78.62666667],
[32.195, -77.9]];


module.exports = () => {
    return nasaCenters2;
}


const ALCenter = [["41°29.2'N", "162°51.0'W"],
["42°39.8'N", "155°57.2'W"],
["43°20.2'N", "151°18.6'W"],
["43°48.2'N", "147°34.2'W"],
["44°08.8'N", "144°21.3'W"],
["44°24.1'N", "141°29.7'W"],
["44°35.6'N", "138°53.8'W"],
["44°44.1'N", "136°30.2'W"],
["44°49.9'N", "134°16.5'W"],
["44°53.7'N", "132°11.0'W"],
["44°55.6'N", "130°12.5'W"],
["44°55.8'N", "128°20.0'W"],
["44°54.7'N", "126°32.9'W"],
["44°52.2'N", "124°50.5'W"],
["44°48.6'N", "123°12.3'W"],
["44°44.0'N", "121°38.0'W"],
["44°38.3'N", "120°07.2'W"],
["44°31.8'N", "118°39.5'W"],
["44°24.4'N", "117°14.8'W"],
["44°16.3'N", "115°52.8'W"],
["44°07.4'N", "114°33.3'W"],
["43°57.9'N", "113°16.2'W"],
["43°47.7'N", "112°01.3'W"],
["43°37.0'N", "110°48.5'W"],
["43°25.6'N", "109°37.6'W"],
["43°13.7'N", "108°28.5'W"],
["43°01.3'N", "107°21.1'W"],
["42°48.5'N", "106°15.4'W"],
["42°35.1'N", "105°11.2'W"],
["42°21.3'N", "104°08.4'W"],
["42°07.1'N", "103°07.0'W"],
["41°52.5'N", "102°06.9'W"],
["41°37.5'N", "101°08.1'W"],
["41°22.1'N", "100°10.4'W"],
["41°06.4'N", "99°13.8'W"],
["40°50.3'N", "98°18.3'W"],
["40°33.9'N", "97°23.7'W"],
["40°17.1'N", "96°30.1'W"],
["40°00.0'N", "95°37.4'W"],
["39°42.6'N", "94°45.6'W"],
["39°24.9'N", "93°54.5'W"],
["39°07.0'N", "93°04.2'W"],
["38°48.7'N", "92°14.6'W"],
["38°30.1'N", "91°25.6'W"],
["38°11.3'N", "90°37.3'W"],
["37°52.2'N", "89°49.6'W"],
["37°32.8'N", "89°02.4'W"],
["37°13.2'N", "88°15.7'W"],
["36°53.3'N", "87°29.5'W"],
["36°33.1'N", "86°43.7'W"],
["36°12.7'N", "85°58.3'W"],
["35°52.1'N", "85°13.3'W"],
["35°31.2'N", "84°28.6'W"],
["35°10.0'N", "83°44.1'W"],
["34°48.6'N", "82°59.9'W"],
["34°26.9'N", "82°15.9'W"],
["34°05.0'N", "81°32.1'W"],
["33°42.9'N", "80°48.4'W"],
["33°20.5'N", "80°04.7'W"],
["32°57.8'N", "79°21.2'W"],
["32°34.9'N", "78°37.6'W"],
["32°11.7'N", "77°54.0'W"],
["31°48.2'N", "77°10.3'W"],
["31°24.5'N", "76°26.5'W"],
["31°00.5'N", "75°42.4'W"]];



//
// ,
// ["30°36.2'N", "74°58.2'W"],
// ["30°11.6'N", "74°13.7'W"],
// ["29°46.8'N", "73°28.8'W"],
// ["29°21.6'N", "72°43.6'W"],
// ["28°56.1'N", "71°57.9'W"],
// ["28°30.3'N", "71°11.6'W"],
// ["28°04.1'N", "70°24.8'W"],
// ["27°37.6'N", "69°37.3'W"],
// ["27°10.7'N", "68°49.0'W"],
// ["26°43.5'N", "67°59.8'W"],
// ["26°15.8'N", "67°09.7'W"],
// ["25°47.7'N", "66°18.5'W"],
// ["25°19.1'N", "65°26.1'W"],
// ["24°50.0'N", "64°32.3'W"],
// ["24°20.5'N", "63°37.1'W"],
// ["23°50.3'N", "62°40.1'W"],
// ["23°19.6'N", "61°41.2'W"],
// ["22°48.1'N", "60°40.2'W"],
// ["22°16.0'N", "59°36.7'W"],
// ["21°43.1'N", "58°30.4'W"],
// ["21°09.2'N", "57°20.8'W"],
// ["20°34.4'N", "56°07.6'W"],
// ["19°58.4'N", "54°49.9'W"],
// ["19°21.1'N", "53°27.0'W"],
// ["18°42.2'N", "51°57.8'W"],
// ["18°01.4'N", "50°20.7'W"],
// ["17°18.2'N", "48°33.6'W"],
// ["16°31.9'N", "46°33.2'W"],
// ["15°41.3'N", "44°14.0'W"],
// ["14°44.2'N", "41°25.1'W"],
// ["13°34.6'N", "37°39.5'W"]
