export const initialState = {
  step:      1,
  specialty: null,
  doctor:    null,
  slot:      null,
  date:      null,
}

export function bookingReducer(state, action) {
  switch (action.type) {
    case 'SELECT_SPECIALTY':
      return {
        ...state,
        step:      2,
        specialty: action.payload,
        doctor:    null,
        slot:      null,
      }

    case 'SELECT_DATE':
      return {
        ...state,
        step: 3,
        date: action.payload,
      }

    case 'SELECT_SLOT':
      return {
        ...state,
        step:   4,
        doctor: action.payload.doctor,
        slot:   action.payload.slot,
      }

    case 'CONFIRM':
      return {
        ...state,
        step: 5,
      }

    case 'BACK':
      return {
        ...state,
        step: Math.max(1, state.step - 1),
      }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}
