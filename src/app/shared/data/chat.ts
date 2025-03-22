export class ChatDB {

  // Chat User
  static chatUser = [
    {
      id: 0,
      name: 'Mark Jecno',
      status: 'Be the change',
      profile: 'assets/images/user/12.png',
      seen: 'online',
      online: true,
      typing: false,
      authenticate: 0,
      call: {
        status: 'incoming',
        date_time: '5 May, 4:40 PM'
      }
    },
    {
      id: 6,
      name: 'Elana Jecno',
      status: 'In Meeting..',
      profile: 'assets/images/user/1.jpg',
      seen: 'online',
      online: true,
      typing: false,
      authenticate: 1,
      call: {
        status: '',
        date_time: ''
      }
    },
    {
      id: 2,
      name: 'Aiden Chavez',
      status: 'Out is my favorite.',
      profile: 'assets/images/user/2.png',
      seen: 'Last Seen 3:55 PM',
      online: false,
      typing: false,
      authenticate: 0,
      call: {
        status: 'incoming',
        date_time: '6 May, 1:50 PM'
      }
    },
    {
      id: 3,
      name: 'Prasanth Anand',
      status: 'Change for anyone.',
      profile: 'assets/images/user/8.jpg',
      seen: 'online',
      online: true,
      typing: false,
      authenticate: 0,
      call: {
        status: 'outgoing',
        date_time: '7 May, 9:40 PM'
      }
    },
    {
      id: 4,
      name: 'Venkata Satyamu',
      status: 'First bun like a sun.',
      profile: 'assets/images/user/4.jpg',
      seen: 'online',
      online: true,
      typing: false,
      authenticate: 0,
      call: {
        status: 'incoming',
        date_time: '7 May, 10:50 PM'
      }
    },
    {
      id: 5,
      name: 'Ginger Johnston',
      status: 'its my life. Mind it.',
      profile: 'assets/images/user/5.jpg',
      seen: 'Last Seen 5:55 PM',
      online: false,
      typing: false,
      authenticate: 0,
      call: {
        status: 'outgoing',
        date_time: '7 May, 11:40 PM'
      }
    },
    {
      id: 1,
      name: 'K.A.I',
      status: 'status pending...',
      profile: 'assets/images/logo/Katuq/katuq-intelligence/katuqintelligence.svg',
      seen: 'online',
      online: true,
      typing: false,
      authenticate: 0,
      call: {
        status: 'outgoing',
        date_time: '8 May, 9:15 AM'
      }
    },
    {
      id: 7,
      name: 'Marked Thomas',
      status: 'away from home',
      profile: 'assets/images/user/11.png',
      seen: 'Last Seen 1:55 PM',
      online: false,
      typing: false,
      authenticate: 0,
      call: {
        status: 'incoming',
        date_time: '8 May, 10:50 Am'
      }
    },
    {
      id: 8,
      name: 'Jaclin Thomas',
      status: 'Single..',
      profile: 'assets/images/user/10.jpg',
      seen: 'Last Seen 3:15 PM',
      online: false,
      typing: false,
      authenticate: 0,
      call: {
        status: 'incoming',
        date_time: '9 May, 11:50 PM'
      }
    },
  ]

  // Message
  static chat = [
    {
      id: 1,
      message: [
        {
          sender: 1,
          time: new Date().toLocaleTimeString(),
          text: 'Soy K.A.I, tu asistente virtual. ¿En qué puedo ayudarte?'
        },
       
      ]
    },
    {
      id: 2,
      message: []
    },
    {
      id: 3,
      message: []
    },
    {
      id: 4,
      message: []
    },
    {
      id: 5,
      message: []
    },
    {
      id: 6,
      message: []
    },
    {
      id: 7,
      message: []
    },
    {
      id: 8,
      message: []
    }
  ]
  
}
