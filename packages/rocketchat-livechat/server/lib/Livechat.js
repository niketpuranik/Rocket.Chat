RocketChat.Livechat = {
	getNextAgent(department) {
		if (department) {
			return RocketChat.models.LivechatDepartmentAgents.getNextAgentForDepartment(department);
		} else {
			return RocketChat.models.Users.getNextAgent();
		}
	},
	sendMessage({ guest, message, roomInfo }) {
		var agent, room;

		room = RocketChat.models.Rooms.findOneById(message.rid);
		if (room == null) {

			// if no department selected verify if there is only one active and use it
			if (!guest.department) {
				var departments = RocketChat.models.LivechatDepartment.findEnabledWithAgents();
				if (departments.count() === 1) {
					guest.department = departments.fetch()[0]._id;
				}
			}

			agent = RocketChat.Livechat.getNextAgent(guest.department);
			if (!agent) {
				throw new Meteor.Error('no-agent-online', 'Sorry, no online agents');
			}
			let roomData = _.extend({
				_id: message.rid,
				name: guest.username,
				msgs: 1,
				lm: new Date(),
				usernames: [agent.username, guest.username],
				t: 'l',
				ts: new Date(),
				v: {
					token: message.token
				}
			}, roomInfo);
			let subscriptionData = {
				rid: message.rid,
				name: guest.username,
				alert: true,
				open: true,
				unread: 1,
				answered: false,
				u: {
					_id: agent.agentId,
					username: agent.username
				},
				t: 'l',
				desktopNotifications: 'all',
				mobilePushNotifications: 'all',
				emailNotifications: 'all'
			};

			RocketChat.models.Rooms.insert(roomData);
			RocketChat.models.Subscriptions.insert(subscriptionData);
		}
		room = Meteor.call('canAccessRoom', message.rid, guest._id);
		if (!room) {
			throw new Meteor.Error('cannot-acess-room');
		}
		return RocketChat.sendMessage(guest, message, room);
	},
	registerGuest({ token, name, email, department, phone, loginToken } = {}) {
		check(token, String);

		const user = RocketChat.models.Users.getVisitorByToken(token, { fields: { _id: 1 } });

		if (user) {
			throw new Meteor.Error('token-already-exists', 'Token already exists');
		}

		const username = RocketChat.models.Users.getNextVisitorUsername();

		var userData = {
			username: username,
			globalRoles: ['livechat-guest'],
			department: department,
			type: 'visitor'
		};

		if (this.connection) {
			userData.userAgent = this.connection.httpHeaders['user-agent'];
			userData.ip = this.connection.httpHeaders['x-real-ip'] || this.connection.clientAddress;
			userData.host = this.connection.httpHeaders.host;
		}

		const userId = Accounts.insertUserDoc({}, userData);

		let updateUser = {
			name: name || username,
			profile: {
				guest: true,
				token: token
			}
		};

		if (phone) {
			updateUser.profile.phones = [ phone ];
		}

		if (email && email.trim() !== '') {
			updateUser.emails = [{ address: email }];
		}

		if (loginToken) {
			updateUser.services = {
				resume: {
					loginTokens: [ loginToken ]
				}
			};
		}

		Meteor.users.update(userId, {
			$set: updateUser
		});

		return userId;
	}
};
