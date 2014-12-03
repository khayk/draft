var mymodule = module.exports;

var x = 1;
mymodule.invoke = function(arg) {
   console.log(arg, x);
   x++;
};