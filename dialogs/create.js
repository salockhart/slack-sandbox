module.exports = info => ({
  callback_id: 'create',
  title: 'Create A Code Snippet',
  submit_label: 'Create',
  elements: [{
    label: 'Name',
    name: 'name',
    type: 'text',
    hint: 'The name you\'ll use to execute your code',
    value: info.name,
  // }, { // TODO: Handle access level for private, channel, global
  //   label: 'Access',
  //   name: 'access',
  //   type: 'select',
  //   placeholder: 'Who can read, edit, and execute this snippet?',
  //   value: info.access,
  //   options: [{
  //     label: 'Anyone in the workspace',
  //     value: 'public',
  //   }, {
  //     label: 'Only me',
  //     value: 'private',
  //   }],
  }, {
    label: 'JavaScript',
    name: 'code',
    type: 'textarea',
    hint: 'Enter the function that you want to run through /run <name> [<args>]',
    value: info.code || `(${[...Array(3)].map((elem, idx) => `${idx > 0 ? ' ' : ''}${String.fromCharCode(97 + idx)}`)}) => {\n\n}`,
  }, {
    label: 'Arguments',
    name: 'args',
    type: 'text',
    hint: 'Arguments to test your function before saving',
    value: info.args,
    optional: true,
  }],
});
