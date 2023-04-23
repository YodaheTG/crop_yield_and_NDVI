// designate the study area using a shapefile 
var study_area =ee.FeatureCollection('users/yodgis/Yem_special_woreda');
var Yem_special = study_area.geometry();
//use it to center the map
Map.centerObject(study_area,10);
//Map.centerObject(AOI, 10);
//load MODIS 500 and 250 collections 

var image_500m = ee.ImageCollection(MODIS_500m); 
var image_250m = ee.ImageCollection(MODIS_250m); 
var listOfImages = image_500m.toList(image_500m.size()); 
var listOfImagesb = image_250m.toList(image_250m.size());

// resmaple MODIS 500 layer to Modis 250 using bilenear reprojection and use the respective MODIS 250
// layer to resample the MODIS 500 layer for years 2002-2019
var i ; 
for (i = 0; i<18; i++){
  
  var LandCover_2018 = ee.Image(listOfImages.get(i));
  var LandCover_2018b = ee.Image(listOfImagesb.get(i));
  var image_10m = LandCover_2018.resample('bilinear').reproject({
  crs: LandCover_2018b.projection().crs(),
  scale: 250
  
});
//store the LC type 1 class from MODIS 500
 var IGBP_class = image_10m.select('LC_Type1');
 var igbpPalette = [
'aec3d4', // water
'152106', '225129', '369b47', '30eb5b', '387242', // forest
'6a2325', 'c3aa69', 'b76031', 'd9903d', '91af40', // shrub, grass
'111149', // wetlands
'cdb33b', // croplands
'cc0013', // urban
'33280d', // crop mosaic
'd7cdcc', // snow and ice
'f7e084', // barren
'6f6f6f' // tundra
];
// select classes 12 an 14 (designated for agricuture use)
var crop = IGBP_class.updateMask(IGBP_class.eq(12));

//print (crop);
var cropb = IGBP_class.updateMask(IGBP_class.eq(14));
//var combinedFeatureCollection = crop.merge(cropb); 
//Map.addLayer(cropb,{},'Crops'); 
// merge the two and create an image collection 
var collectionFromImagesb = ee.ImageCollection.fromImages(
  [crop, cropb]);
var crop_mask_a = crop.reduceToVectors({
geometry: study_area, 

crs: image_10m.select('LC_Type1').projection(),
scale: 500, //500m spatial resolution of the land cover imagery
geometryType: 'polygon',
eightConnected: false,
labelProperty: 'crop_area', //Name of the land cover class reducer: ee.Reducer.countEvery()
});
//loop through each year's selected lancover class (2002-2019), use them as a mask to extract evi vlaues 
var a = '2002-01-01';
// add one to every year 
var seqa = i+2002; 
var seqb = seqa.toString(); 
var month = '-01';
var date = '-01';
var conc = seqb.concat(month, date);
var seqc =  1+seqa; 
var seqd = seqc.toString(); 
var monthb = '-12';
var dateb = '-31';
var concb = seqd.concat(monthb, dateb);
print (seqa);
var collectionMODIS = ee.ImageCollection(image_250m.filterDate(conc, concb));
//print (collectionMODIS);
var taskMODIS = function(image){
    return image
    .clip(crop_mask_a).select('EVI').multiply(0.0001).copyProperties(image,['system:time_start']);  
    };
var collectionMODIS = collectionMODIS.map(taskMODIS);  
//create a chart for each year's yearly evi value. this is where I am stuck. I dont know how I can export 
//all these values in one excel files and use them for smoothing.
var Chart3 = ui.Chart.image.doySeriesByRegion({ imageCollection:collectionMODIS, bandName:'EVI', regions:crop_mask_a, regionReducer:ee.Reducer.mean(), scale:250,
})
.setChartType ('ScatterChart')
.setOptions({
title: 'Mean annual profiles (2015-2018) for each land cover',
lineWidth: 1,
pointSize: 3,
vAxis: {title: 'EVI mean'},
hAxis: {title: 'Day of Year', gridlines: {count: 7}},
});
var series1 = ui.Chart.image.doySeries(
  collectionMODIS, study_area,  ee.Reducer.mean(), 500);
//print (series1); 
var NDVIPalette =['red','blue','yellow','green'];
Map.addLayer(collectionMODIS,{min:-0.4,max:0.4,palette:NDVIPalette},'Mean EVI values (0.4-0.4)');
}
Map.addLayer(Yem_special,{color:'blue'},'Yem special woreda');
//set function for true color bands 
var trueColour = {
 bands: ['B4', 'B3', 'B2'],
 min: 0,
 max: 1
 };


