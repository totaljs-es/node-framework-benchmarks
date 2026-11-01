NEWACTION('Bench/validate', {
	name: 'Validate a body',
	input: '*name:String, age:Number',
	action: function($, model) {
		$.callback({ name: model.name, age: model.age });
	}
});

exports.install = function() {
	ROUTE('GET /hello/', hello);
	ROUTE('GET /users/{id}/', user);
	ROUTE('POST /validate/ --> *Bench/validate');
};

function hello($) {
	$.json({ hello: 'world' });
}

function user($) {
	$.json({ id: $.params.id });
}
