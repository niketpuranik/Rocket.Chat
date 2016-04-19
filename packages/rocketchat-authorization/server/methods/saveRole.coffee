Meteor.methods
	'authorization:saveRole': (roleData) ->
		if not Meteor.userId() or not RocketChat.authz.hasPermission Meteor.userId(), 'access-permissions'
			throw new Meteor.Error "error-not-authorized", 'Not authorized', { method: 'authorization:saveRole' }

		if not roleData.name?
			throw new Meteor.Error 'error-role-name-required', 'Role name is required', { method: 'authorization:saveRole' }

		if roleData.scope not in ['Users', 'Subscriptions']
			roleData.scope = 'Users'

		RocketChat.Notifications.notifyAll('roles-change', { type: 'changed', _id: roleData.name });

		return RocketChat.models.Roles.createOrUpdate roleData.name, roleData.scope, roleData.description
