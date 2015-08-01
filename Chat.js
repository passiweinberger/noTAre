function Chat(organization, course, tutor, start_time) {
  this.org = organization;
  this.course = course;
  this.tutor = tutor;
  this.start_time = start_time;
};

Chat.prototype.setOrg = function(organization) {
  this.org = organization;
};
Chat.prototype.setCourse = function(course) {
  this.course = course;
};
Chat.prototype.setTutor = function(tutor) {
  this.tutor = tutor;
};
Chat.prototype.setStartTime = function(start_time) {
  this.org = start_time;
};

module.exports = Chat;
