import router from '@adonisjs/core/services/router';
import vine from '@vinejs/vine';
const validator = vine.compile(vine.object({
    name: vine.string().minLength(1),
    age: vine.number().optional(),
}));
router.get('/hello/', async () => ({ hello: 'world' }));
router.get('/users/:id/', async ({ params }) => ({ id: params.id }));
router.post('/validate/', async ({ request, response }) => {
    try {
        const data = await validator.validate(request.body());
        return { name: data.name, age: data.age };
    }
    catch (error) {
        return response.status(400).send({ error: 'invalid' });
    }
});
//# sourceMappingURL=routes.js.map