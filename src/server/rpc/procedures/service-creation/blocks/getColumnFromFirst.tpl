<context id="1">
  <inputs>
    <input><%= field %></input>
    <input><%= dataVariable %></input>
  </inputs>
  <variables/>
  <script>
    <block s="doDeclareVariables">
      <list>
        <l>index</l>
      </list>
    </block>
    <block s="doSetVar">
      <l>index</l>
      <l>1</l>
    </block>
    <block s="doUntil">
      <block s="reportGreaterThan">
        <block var="index"/>
        <block s="reportListLength">
          <block var="<%= dataVariable %>"/>
        </block>
      </block>
      <script>
        <block s="doIf">
          <block s="reportEquals">
            <block s="reportListItem">
              <l>1</l>
              <block s="reportListItem">
                <block var="index"/>
                <block var="<%= dataVariable %>"/>
              </block>
            </block>
            <block var="<%= field %>"/>
          </block>
          <script>
            <block s="doReport">
              <block s="reportListItem">
                <l><%= column %></l>
                <block s="reportListItem">
                  <block var="index"/>
                  <block var="<%= dataVariable %>"/>
                </block>
              </block>
            </block>
          </script>
        </block>
        <block s="doChangeVar">
          <l>index</l>
          <l>1</l>
        </block>
      </script>
    </block>
    <block s="doReport">
      <l>NOT FOUND</l>
    </block>
  </script>
  <receiver/>
  <context id="131">
    <inputs/>
    <variables/>
    <receiver/>
  </context>
</context>
