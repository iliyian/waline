import { badRequest, WalineError } from '../error.js';
import type { OAuthAuthorizeInput, WalineContext } from '../types.js';
import { currentUser } from '../utils/auth.js';
import type { CoreRuntime } from '../utils/runtime.js';
import { optionalString, requiredCapability, requiredString } from '../utils/validation.js';

export const createOAuthHandler = ({ models, random, services }: CoreRuntime) => ({
  async authorize(input: OAuthAuthorizeInput, ctx: WalineContext) {
    const oauthService = requiredCapability(services.oauth, 'oauth');
    const tokenService = requiredCapability(services.token, 'token');
    const provider = requiredString(input.type, 'type');

    if (!/^[A-Za-z][A-Za-z0-9_]*$/u.test(provider)) badRequest({ field: 'type' });

    const profile = await oauthService.authorize(input, ctx);

    if (!profile?.id) {
      throw new WalineError('OAUTH_FAILED', 400, undefined, profile);
    }

    const id = requiredString(profile.id, 'id');
    const email = optionalString(profile.email, 'email', 255);
    const name = optionalString(profile.name, 'name', 255);
    const url = optionalString(profile.url, 'url', 255);
    const avatar = optionalString(profile.avatar, 'avatar', 255);

    const [linked] = await models.Users.select({
      [provider]: id,
    });

    if (linked) {
      return { token: await tokenService.sign(linked.objectId), user: linked };
    }

    const user = currentUser(ctx);
    if (user) {
      const update = {
        [provider]: id,
        ...(!user.avatar && avatar ? { avatar } : {}),
      };
      const [updated] = await models.Users.update(update, {
        objectId: user.objectId,
      });

      return { user: updated };
    }

    const count = (await models.Users.count()) as number;
    const passwordService = services.password;
    const created = await models.Users.add({
      email,
      display_name: name,
      url,
      avatar,
      [provider]: id,
      password: passwordService ? await passwordService.hash(String(random())) : undefined,
      type: count === 0 ? 'administrator' : 'guest',
    });

    return {
      token: await tokenService.sign(created.objectId),
      user: created,
    };
  },
});
