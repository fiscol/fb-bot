// escape special unit

exports.EscapeLetter = function(pageName){
	var replaceDot = (pageName || '').replace('.', ',');
		// replaceDot = pageName.replace(/\s+/g, "") 
	// var replaceSpace = (pageName || '').replace(' ', '_');
	return replaceDot
}

