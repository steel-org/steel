# This will be updated with proper documentaries from Each Markdown files every time a change is made.

## Proper screenshots and ideos contents will be included.

so i have some things i want to say , i did something yesterday , went to physically meet some friends yesterday and showed them the app , so i got reviews and erros , for v4.1.1 , i made it yester on the 18 and it was acctually working just like how v1 did buh it had erros , that was also the time, i was able to succesfully laucnhed a working local server , so here are the erros i got and witnessed .
 
 - messages were sending four times , on the reciver side , it shows three 
 - profile pic update are slow to show in other user side 
 - when user logs out , the chat is gone  buh not completely , when the user tries to start another chat with the former person , it brings it back with messages
 - For group chats , this one is lost also and eventually found only when creating with the same user as before buh without old messages 
 - i was told the name of the app is that good
 - i was also tod i need to work on the ui ans sidebar ui , i also noticed it aint good 
 - then for the bio and display name , the background color and text color is the same 
 - i was also told to work on the group chat profile at the top of chat area and layout 
 - then for other user profile , the details isnt much , it should be more than whta it is there 
 - then for the group chat profile , the details isnt much , it should be more than whta it is there 
 - then for ther user , when they go offline , it still shows online in the chat 
 - there is no timer for the messages sent and day label for when they are sent 
 - Also , sometimes an erro occurs when sending message to a roup , it send to dm also 
 - Also when one user is typing , its emits globally and not only in the chat they are typing in
 - Also , there is no notification for new messages
 - Also , messages can't be edited
 - There wasnt message reaction , despite called in db 
 - For images sent , thy are showing up as Url , and not as image 
 - For files and imagessent , they show up as url and are not downloadable
 - For long messages , it is broken down into the div message box and overflows
 - Images and files are coming as direct urls , exposing the storage.
 - in settings , your profile pic updated avatar doesnt show 
 - When you clcik new group in settings , it doesnt open group creation , instead you need to clcik on it again

 **So i've took all these reviews into coreection and will plan to laucnh v4.2.0 soon**

***

# Today 21st , been days, havent launched v4.2

### Here are some things i plan to do today 
##
- Audit current Next.js pages and routing (pages/chat, pages/group, pages/index) and design multi-page navigation for mobile/desktop (home when no chat selected, sidebar as home on mobile)

- Implement Home page with sidebar conversations/groups list and empty state; make it the default on desktop when no chat is selected
- Make mobile responsive
- Make multipgage
- Added notifcations prompt 
- Mad messages send even when other user user isnt online 
- Fixed calling replying globally
- Make mobile sidebar act as Home (first screen) with navigation to chats/groups; ensure back navigation returns to Home

- Ensure /chat/[id] and /group/[id] pages load ChatLayout with correct store/ws wiring; handle deep links

- Add auth pages (/auth/login, /auth/register) and integrate with apiService + protected routes

- Add /settings page for profile, notifications, theme; wire to store/services

- Finalize offline outbox integration with ws reconnect and optimistic replacement across pages

- Test mobile and desktop flows: navigation, back behavior, login/logout, chat send (online/offline), replies, attachments

# Today 5th , been days, launched v4.2.1

### Here are some things i did today

- Fixed Editor not showing in Desktop mode.