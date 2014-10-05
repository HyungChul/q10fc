
/*
 * GET users listing.
 */
var items = [{"text":"1st post"}];

exports.mainView = function(req, res){
   res.render('teamMake', { title: 'Qoo10FC 팀 편성', userType: req.query.userType })
};