// The same API as the other apps, with NestJS (Express platform). Nest is written around decorators, which Node.js does not run in
// plain JavaScript: they are applied here as functions, which is exactly what the `@` syntax compiles to. Validation: zod.
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { Module, Controller, Get, Post, Param, Body, HttpCode, BadRequestException } = require('@nestjs/common');
const { z } = require('zod');

const schema = z.object({ name: z.string().min(1), age: z.number().optional() });

class BenchController {
	hello() {
		return { hello: 'world' };
	}
	user(id) {
		return { id: id };
	}
	validate(body) {
		const result = schema.safeParse(body);
		if (!result.success)
			throw new BadRequestException({ error: 'invalid' });
		return { name: result.data.name, age: result.data.age };
	}
}

const proto = BenchController.prototype;
const method = name => Object.getOwnPropertyDescriptor(proto, name);

Controller()(BenchController);
Get('hello/')(proto, 'hello', method('hello'));
Get('users/:id/')(proto, 'user', method('user'));
Param('id')(proto, 'user', 0);
Post('validate/')(proto, 'validate', method('validate'));
HttpCode(200)(proto, 'validate', method('validate'));
Body()(proto, 'validate', 0);

class AppModule {}
Module({ controllers: [BenchController] })(AppModule);

NestFactory.create(AppModule, { logger: false }).then(app => app.listen(+process.env.PORT || 8310, '0.0.0.0'));
